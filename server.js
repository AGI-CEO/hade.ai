import express from "express";
import pg from "pg";

const app = express();
const port = 3000;

//serve the public static files
app.use(express.static("public"));

app.use(express.json());
// create a new pool here using the connection string above
const pool = new pg.Pool({
  connectionString: "postgres://postgres:password@localhost:5432/postgres",
});

app.listen(port, () => {
  console.log(`hade.ai listening at http://localhost:${port}`);
});
