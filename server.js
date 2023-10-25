import express from "express";
import fileUpload from "express-fileupload";
import pg from "pg";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { loadSummarizationChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { VectorDBQAChain } from "langchain/chains";
import { ChainTool } from "langchain/tools";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
import { SupabaseHybridSearch } from "langchain/retrievers/supabase";

import {
  RunnableSequence,
  RunnablePassthrough,
} from "langchain/schema/runnable";

const app = express();

dotenv.config();
const port = process.env.port;
const privateKeyDB = process.env.DB_URL;
const urlDB = process.env.DB_KEY;

const memory = new BufferMemory({
  returnMessages: true,
  inputKey: "input",
  outputKey: "output",
  memoryKey: "history",
});

// Create a single supabase client for interacting with your database
const supabase = createClient(privateKeyDB, urlDB);

//serve the public static files
app.use(express.static("public"));
app.use(fileUpload());
app.use(express.json());

app.post("/login", async (req, res) => {
  console.log(req.body);

  const { email } = req.body;
  const { data, error } = await supabase
    .from("Users")
    .select("*")
    .eq("email", email);

  if (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  } else {
    if (data.length > 0) {
      // If email exists in db, return a welcome back message
      res.json({ message: "Welcome back 🥳 (i missed u)", userId: data[0].id });
    } else {
      // If email doesn't exist, return a thanks for using my tool
      // If email doesn't exist, create a new row in the users table
      const { error: insertError } = await supabase
        .from("Users")
        .insert([{ email }]);
      console.log(insertError);
      if (insertError) {
        console.log(insertError);
        res.status(500).json({ error: insertError.message });
      } else {
        // Get the id of the new user
        const { data: user, error: selectError } = await supabase
          .from("Users")
          .select("id")
          .eq("email", email)
          .single();

        if (selectError) {
          console.log(selectError);
          res.status(500).json({ error: selectError.message });
        } else {
          console.log(user);
          res.json({
            message: "Thanks for trying our tool, you're awesome 😎",
            userId: user.id,
          });
        }
      }
    }
  }
});

let summary = null;

app.post("/upload", async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).send({ message: "No file was uploaded." });
    }

    const file = req.files.pdf;
    const tempFilePath = `/tmp/${file.name}`;
    const userId = req.body.userId;

    // Write the PDF to a temp file
    file.mv(tempFilePath, async (err) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: "Error during file upload." });
      } else {
        // Summarize the PDF and save to DB
        const summary = await summarizePdfAndSaveToDb(
          tempFilePath,
          file.name.replace(".pdf", "")
        );

        // Add a new row to the PDFUploads table
        const { data, error } = await supabase
          .from("PDFUploads")
          .insert([
            { user_id: userId, pdf_name: file.name.replace(".pdf", "") },
          ]);

        if (error) {
          console.error(error);
          res.status(500).send({ message: "Error during database operation." });
        } else {
          // Create an instance of SupabaseVectorStore and OpenAIEmbeddings
          const embeddings = new OpenAIEmbeddings({
            azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
            azureOpenAIApiInstanceName:
              process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            azureOpenAIApiDeploymentName: "text-embedding-ada-002",
            model: "text-embedding-ada-002",
          });
          const vectorStore = new SupabaseVectorStore(embeddings, {
            client: supabase,
            tableName: "documents",
          });

          // Add the PDF content to the vector store
          // Load the PDF content
          const loader = new PDFLoader(tempFilePath, { splitPages: true });
          const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 100,
          });
          const docs = await loader.load();

          console.log("Embedding completed.");

          // Delete the PDF file
          //fs.unlinkSync(tempFilePath);
          res.send({
            message: "File uploaded successfully.",
            summary: summary,
            pdfName: file.name.replace(".pdf", ""),
            pdfPath: tempFilePath,
          });
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error during file upload." });
  }
});
// Function to read PDF as text
async function readPdfAsText(pdfPath) {
  let dataBuffer = fs.readFileSync(pdfPath);

  pdf(dataBuffer).then(function (data) {
    fs.writeFileSync("/tmp/pdfText.txt", data.text);
  });
}

// Function to update database row
async function updateDatabaseRow(pdfName, summary) {
  const { data, error } = await supabase
    .from("PDFUploads")
    .update({ summary: summary })
    .eq("pdf_name", pdfName);

  if (error) {
    console.error(error);
  }
}

async function summarizePdfAndSaveToDb(pdfPath, pdfName) {
  // Load the PDF content
  const loader = new PDFLoader(pdfPath, { splitPages: true });
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 100,
  });
  const docs = await loader.load();

  // Initialize the Langchain components
  const model = new ChatOpenAI({
    temperature: 0.9,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_BASE_PATH: process.env.AZURE_OPENAI_BASE_PATH,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    MODEL_NAME: "gpt-35-turbo-16k",
  });

  // Create the summarization chain
  const chain = loadSummarizationChain(model, {
    type: "map_reduce",
    verbose: true,
  });

  // Generate the summary
  const result = await chain.call({ input_documents: docs });
  console.log(result.text);
  // Save the summary to the database
  await updateDatabaseRow(pdfName, result.text);
  // Return the summary
  return result.text;
}

app.post("/message", async (req, res) => {
  const userId = req.body.userId;
  const pdfPath = req.body.pdfPath;

  const embeddings = new OpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: "text-embedding-ada-002",
    model: "text-embedding-ada-002",
  });

  // Initialize the Langchain components
  const model = new ChatOpenAI({
    temperature: 0.9,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_BASE_PATH: process.env.AZURE_OPENAI_BASE_PATH,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    MODEL_NAME: "gpt-35-turbo-16k",
  });

  const retriever = new SupabaseHybridSearch(embeddings, {
    client: supabase,
    similarityK: 2,
    keywordK: 2,
    tableName: "documents",
    similarityQueryName: "match_documents",
    keywordQueryName: "kw_match_documents",
  });

  // Create an instance of VectorDBQAChain using the SupabaseHybridSearch instance
  const chain = VectorDBQAChain.fromLLM(model, retriever);

  const qaTool = new ChainTool({
    name: "contextual-qa",
    description:
      "Contextual QA - useful for when you need contextual information from a document",
    chain: chain,
  });

  const tools = [qaTool];
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "zero-shot-react-description",
    memory: memory,
  });
  console.log("Loaded agent.");

  const input = req.body.message;

  console.log(`Executing with input "${input}"...`);

  const result = await executor.call({ input });

  console.log(`Got output ${result.output}`);

  res.json({ response: { message: result.output } });
});

app.listen(port, () => {
  console.log(`hade.ai listening at http://localhost:${port}`);
});
