import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const sqlPath = fileURLToPath(new URL("./allow-vip-role.sql", import.meta.url));
const sql = await readFile(sqlPath, "utf8");

try {
  await pool.query(sql);
  console.log("The users table now allows ADMIN and VIP roles.");
} finally {
  await pool.end();
}
