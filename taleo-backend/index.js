// index.js
//
// This is the entry point of the backend. Run it with: npm start
//
// It exposes the health, languages, dropdown options, registration count,
// and registration submission endpoints used by the frontend and AWS.

import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                   // maximum 5 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many registration attempts. Please try again later."
  }
});

const registrationCountLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // maximum 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many count requests. Please try again shortly."
  }
});

const dropdownOptionsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // maximum 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many dropdown option requests. Please try again shortly."
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later."
  }
});

const REGISTRATION_COUNT_CACHE_MS = 30 * 1000;
let cachedRegistrationCount = null;
let registrationCountCacheExpiresAt = 0;

const DROPDOWN_OPTIONS_CACHE_MS = 5 * 60 * 1000;
const dropdownOptionsCache = new Map();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "0", 10);

if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json());  // lets Express read JSON request bodies

const PORT = process.env.PORT || 4000;

function requireAuth(req, res, next) {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return res.status(503).json({ error: "Authentication is not configured" });
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (typeof payload !== "object" || !payload.sub || !payload.role) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (String(req.user.role).toUpperCase() !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  });
}

// -----------------------------------------------------------------------
// GET /health
// -----------------------------------------------------------------------
// Returns 200 if the app AND the database are both reachable.
// AWS's Application Load Balancer will poll this repeatedly once deployed,
// to decide whether an instance is healthy or needs to be replaced.
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

// -----------------------------------------------------------------------
// POST /login
// -----------------------------------------------------------------------
// Accepts a plain password over HTTPS, compares it with users.password_hash,
// and returns a signed JWT for ADMIN and VIP users. Password hashes are never returned.
app.post("/login", loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const password = typeof req.body?.password === "string"
    ? req.body.password
    : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (email.length > 254 || password.length > 200) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return res.status(503).json({ error: "Authentication is not configured" });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const role = String(user.role).toUpperCase();

    if (!["ADMIN", "VIP"].includes(role)) {
      return res.status(403).json({ error: "This account cannot sign in" });
    }

    const token = jwt.sign(
      {
        email: user.email,
        role,
      },
      JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    res.json({
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Could not complete login" });
  }
});

// -----------------------------------------------------------------------
// POST /admin/users
// -----------------------------------------------------------------------
// Creates a VIP account. Only an authenticated ADMIN may use this endpoint.
// The plain password is hashed before it is stored and is never returned.
app.post("/admin/users", requireAdmin, async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const password = typeof req.body?.password === "string"
    ? req.body.password
    : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }

  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({
      error: "Password must be between 8 and 200 characters",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'VIP')
       RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );
    const user = result.rows[0];

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: String(user.role).toUpperCase(),
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    console.error("VIP user creation failed:", err.message);
    return res.status(500).json({ error: "Could not create the VIP account" });
  }
});

// -----------------------------------------------------------------------
// GET /admin/registrations
// -----------------------------------------------------------------------
// Returns every interested person and their submitted answers. Protected by
// the ADMIN JWT guard. English labels are used only for the admin table.
app.get("/admin/registrations", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id,
              r.name,
              r.phone_number,
              r.created_at,
              MAX(CASE WHEN c.code = 'BOOK_FOR' THEN o.code END) AS book_for_code,
              MAX(CASE WHEN c.code = 'BOOK_FOR' THEN COALESCE(t.label, o.code) END) AS book_for_label,
              MAX(CASE WHEN c.code = 'FORMAT_INTEREST' THEN o.code END) AS format_interest_code,
              MAX(CASE WHEN c.code = 'FORMAT_INTEREST' THEN COALESCE(t.label, o.code) END) AS format_interest_label
       FROM interest_registrations r
       LEFT JOIN registration_dropdown_answers a ON a.registration_id = r.id
       LEFT JOIN dropdown_categories c ON c.id = a.category_id
       LEFT JOIN dropdown_options o ON o.id = a.option_id
       LEFT JOIN languages l ON l.code = 'en'
       LEFT JOIN dropdown_option_translations t
         ON t.option_id = o.id AND t.language_id = l.id
       GROUP BY r.id, r.name, r.phone_number, r.created_at
       ORDER BY r.created_at DESC`
    );

    res.json({
      registrations: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phoneNumber: row.phone_number,
        createdAt: row.created_at,
        bookForCode: row.book_for_code,
        bookForLabel: row.book_for_label,
        formatInterestCode: row.format_interest_code,
        formatInterestLabel: row.format_interest_label,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch admin registrations:", err.message);
    res.status(500).json({ error: "Could not fetch registrations" });
  }
});

// -----------------------------------------------------------------------
// GET /languages
// -----------------------------------------------------------------------
// Returns every supported language so the frontend can build its language
// controls directly from the database without hard-coded codes or names.
app.get("/languages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT code, name FROM languages ORDER BY id"
    );

    res.json({ languages: result.rows });
  } catch (err) {
    console.error("Failed to fetch languages:", err.message);
    res.status(500).json({ error: "Could not fetch languages" });
  }
});

// -----------------------------------------------------------------------
// GET /dropdown-options
// -----------------------------------------------------------------------
// Returns every dropdown category and its valid options so the frontend
// does not need to hard-code values that already exist in the database.
app.get("/dropdown-options", dropdownOptionsLimiter, async (req, res) => {
  try {
    if (req.query.lang !== undefined && typeof req.query.lang !== "string") {
      return res.status(400).json({ error: "lang must be a single language code" });
    }

    const requestedLang = req.query.lang?.trim();
    const now = Date.now();
    const languageResult = requestedLang
      ? await pool.query(
          "SELECT code FROM languages WHERE code = $1",
          [requestedLang]
        )
      : await pool.query(
          "SELECT code FROM languages ORDER BY id LIMIT 1"
        );

    if (languageResult.rows.length === 0) {
      if (!requestedLang) {
        return res.status(500).json({
          error: "No supported languages are configured",
        });
      }

      return res.status(400).json({
        error: `Language code "${requestedLang}" does not exist`,
      });
    }

    const lang = languageResult.rows[0].code;
    const cached = dropdownOptionsCache.get(lang);

    if (cached && now < cached.expiresAt) {
      return res.json({ categories: cached.categories });
    }

    const result = await pool.query(
      `SELECT c.code AS category_code,
              o.code AS option_code,
              t.label
       FROM dropdown_categories c
       JOIN dropdown_options o ON o.category_id = c.id
       JOIN dropdown_option_translations t ON t.option_id = o.id
       JOIN languages l ON l.id = t.language_id
       WHERE l.code = $1
       ORDER BY c.id, o.id`,
      [lang]
    );

    const categoriesByCode = new Map();

    for (const row of result.rows) {
      if (!categoriesByCode.has(row.category_code)) {
        categoriesByCode.set(row.category_code, {
          code: row.category_code,
          options: [],
        });
      }

      categoriesByCode.get(row.category_code).options.push({
        code: row.option_code,
        label: row.label,
      });
    }

    const categories = [...categoriesByCode.values()];

    dropdownOptionsCache.set(lang, {
      categories,
      expiresAt: now + DROPDOWN_OPTIONS_CACHE_MS,
    });

    res.json({ categories });
  } catch (err) {
    console.error("Failed to fetch dropdown options:", err.message);
    res.status(500).json({ error: "Could not fetch dropdown options" });
  }
});

// -----------------------------------------------------------------------
// GET /registration-count
// -----------------------------------------------------------------------
// Powers the "X of 100 joined" live counter on the landing page.
// Deliberately just COUNT(*) — no stored counter column exists, by design.
app.get("/registration-count", registrationCountLimiter, async (req, res) => {
  try {
    const now = Date.now();

    if (
      cachedRegistrationCount !== null &&
      now < registrationCountCacheExpiresAt
    ) {
      return res.json({ count: cachedRegistrationCount, goal: 100 });
    }

    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM interest_registrations"
    );

    cachedRegistrationCount = result.rows[0].count;
    registrationCountCacheExpiresAt = now + REGISTRATION_COUNT_CACHE_MS;

    res.json({ count: cachedRegistrationCount, goal: 100 });
  } catch (err) {
    console.error("Failed to fetch registration count:", err.message);
    res.status(500).json({ error: "Could not fetch registration count" });
  }
});

// -----------------------------------------------------------------------
// POST /register
// -----------------------------------------------------------------------
// Expected JSON body:
// {
//   "name": "Ahmad",
//   "phoneNumber": "+60123456789",
//   "bookForCode": "MY_CHILD",          // matches dropdown_options.code
//   "formatInterestCode": "DIGITAL_BOOK" // matches dropdown_options.code
// }
app.post("/register", registrationLimiter, async (req, res) => {
  const { name, phoneNumber, bookForCode, formatInterestCode } = req.body;

  // Basic presence check — the DB's own constraints are the final authority,
  // but failing fast here gives clearer error messages to the frontend.
  if (!name || !phoneNumber || !bookForCode || !formatInterestCode) {
    return res.status(400).json({
      error:
        "name, phoneNumber, bookForCode, and formatInterestCode are all required",
    });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // 1. Insert the registration itself
    const regResult = await client.query(
      `INSERT INTO interest_registrations (name, phone_number)
       VALUES ($1, $2)
       RETURNING id`,
      [name, phoneNumber]
    );
    const registrationId = regResult.rows[0].id;

    // 2. Look up the option_id + category_id for each dropdown answer,
    //    then insert into registration_dropdown_answers.
    // Doing this generically means BOOK_FOR and FORMAT_INTEREST are
    // handled by the same code path — matching the schema's design intent.
    const answers = [
      { categoryCode: "BOOK_FOR", optionCode: bookForCode },
      { categoryCode: "FORMAT_INTEREST", optionCode: formatInterestCode },
    ];

    for (const answer of answers) {
      const optionResult = await client.query(
        `SELECT o.id AS option_id, o.category_id
         FROM dropdown_options o
         JOIN dropdown_categories c ON c.id = o.category_id
         WHERE c.code = $1 AND o.code = $2`,
        [answer.categoryCode, answer.optionCode]
      );

      if (optionResult.rows.length === 0) {
        throw new Error(
          `Invalid option "${answer.optionCode}" for category "${answer.categoryCode}"`
        );
      }

      const { option_id, category_id } = optionResult.rows[0];

      await client.query(
        `INSERT INTO registration_dropdown_answers (registration_id, category_id, option_id)
         VALUES ($1, $2, $3)`,
        [registrationId, category_id, option_id]
      );
    }

    await client.query("COMMIT");

    // Force the next count request to query the database so a successful
    // registration appears immediately instead of waiting for cache expiry.
    cachedRegistrationCount = null;
    registrationCountCacheExpiresAt = 0;

    res.status(201).json({ id: registrationId, message: "Registration successful" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    // Postgres unique_violation error code — this phone number already registered
    if (err.code === "23505") {
      return res.status(409).json({ error: "This phone number is already registered" });
    }

    console.error("Registration failed:", err.message);
    res.status(400).json({ error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Taleo backend running on http://localhost:${PORT}`);
});
