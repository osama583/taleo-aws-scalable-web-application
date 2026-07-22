// db.js
//
// This file is the ONLY place that knows how to connect to Postgres.
// Every value below comes from process.env — meaning it comes from your
// .env file locally, or from AWS environment configuration later.
// The rest of the app never sees a hostname or password directly.

import pg from "pg";
import dotenv from "dotenv";

dotenv.config(); // loads .env into process.env

const { Pool } = pg;

// A "pool" reuses a small number of open DB connections instead of opening
// a brand new one for every request — this is the standard, efficient way
// to talk to Postgres from a web server.
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Simple helper other files can call instead of importing pg directly.
export async function query(text, params) {
  return pool.query(text, params);
}
