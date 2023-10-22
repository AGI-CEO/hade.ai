import express from "express";
import fileUpload from "express-fileupload";
import pg from "pg";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const app = express();
const port = 3000;

dotenv.config();

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

//serve the public static files
app.use(express.static("public"));
app.use(fileUpload());
app.use(express.json());

app.post("/login", async (req, res) => {
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
      res.json({ message: "Welcome back 🥳 (i missed u )" });
    } else {
      // If email doesn't exist, return a thanks for using my tool
      res.json({ message: "Thanks for trying our tool, you're awesome 😎" });
    }
  }
});

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
        // Delete the PDF file
        fs.unlinkSync(tempFilePath);

        // Add a new row to the PDFUploads table
        const { data, error } = await supabase
          .from("PDFUploads")
          .insert([
            { userId: user_id, pdf_name: file.name.replace(".pdf", "") },
          ]);

        if (error) {
          console.error(error);
          res.status(500).send({ message: "Error during database operation." });
        } else {
          res.send({ message: "File uploaded successfully." });
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error during file upload." });
  }
});

app.listen(port, () => {
  console.log(`hade.ai listening at http://localhost:${port}`);
});
