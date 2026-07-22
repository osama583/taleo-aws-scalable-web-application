import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

function promptHidden(message) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("This command must be run in an interactive terminal");
  }

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      resolve(value);
    };

    const onData = (chunk) => {
      const input = String(chunk);

      for (const character of input) {
        if (character === "\u0003") {
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          reject(new Error("Password reset cancelled"));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }

        if (character >= " ") {
          value += character;
          stdout.write("•");
        }
      }
    };

    stdout.write(message);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function setAdminPassword() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  const emailInput = await terminal.question("Admin email: ");
  terminal.close();

  const email = emailInput.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Enter a valid admin email address");
  }
  const password = await promptHidden("New password: ");
  const confirmation = await promptHidden("Confirm new password: ");

  if (password.length < 10) {
    throw new Error("Password must contain at least 10 characters");
  }

  if (password !== confirmation) {
    throw new Error("Passwords do not match");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash,
                   role = 'ADMIN'`,
    [email, passwordHash]
  );

  stdout.write(`Admin credentials configured for ${email}. You can now sign in at /login.\n`);
}

try {
  await setAdminPassword();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
