import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = 3000;

dotenv.config();

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

//serve the public static files
app.use(express.static("public"));

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
app.listen(port, () => {
  console.log(`hade.ai listening at http://localhost:${port}`);
});
