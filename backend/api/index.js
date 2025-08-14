// index.js
require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const serverless = require("serverless-http"); // ✅ Added for Vercel

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load form schema (ensure file exists)
const schemaPath = path.join(__dirname, "form_schema.json");
let formSchema = { fields: [] };
try {
  if (fs.existsSync(schemaPath)) {
    formSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  } else {
    console.error("❌ form_schema.json not found.");
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Failed to read form_schema.json:", err);
  process.exit(1);
}

// MongoDB variables
let db, registrationsCollection, otpsCollection, panCollection;

// MongoDB connection function
async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("udyam"); // Main DB
    registrationsCollection = db.collection("registrations");
    otpsCollection = db.collection("otps");
    panCollection = db.collection("udyam-pan"); // NEW collection for PAN details
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}
connectDB();

// Schema-based validation
function validateAgainstSchema(data) {
  const errors = [];

  (formSchema.fields || []).forEach((f) => {
    const name = f.name || f.id;
    const val = data[name];

    if (f.required && (val === undefined || val === "")) {
      errors.push({ field: name, msg: `${f.label || name} is required` });
      return;
    }

    if (f.pattern && val) {
      const regex = new RegExp(f.pattern);
      if (!regex.test(String(val))) {
        errors.push({ field: name, msg: `${f.label || name} invalid format` });
      }
    }
  });

  return errors;
}

// Routes
app.get("/api/schema", (req, res) => {
  res.json(formSchema);
});

app.get("/", (req, res) => {
  res.send("Welcome to the Udyam API");
});

app.post("/api/validate", (req, res) => {
  const errors = validateAgainstSchema(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }
  res.json({ ok: true });
});

// Generate OTP
app.post("/api/generate-otp", async (req, res) => {
  try {
    const errors = validateAgainstSchema(req.body);
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const { aadhaar, name, consent } = req.body;
    if (!aadhaar || !name || !consent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await otpsCollection.insertOne({
      aadhaar,
      name,
      otp,
      createdAt: new Date(),
    });

    console.log(`📩 OTP for ${aadhaar}: ${otp}`);

    res.json({ message: "OTP generated successfully", otp });
  } catch (err) {
    console.error("❌ OTP generation failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Verify OTP
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { aadhaar, otp } = req.body;
    if (!aadhaar || !otp) {
      return res.status(400).json({ error: "Aadhaar and OTP are required" });
    }

    const record = await otpsCollection.findOne({ aadhaar, otp });
    if (!record) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    res.json({ ok: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("❌ OTP verification failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Submit PAN details
app.post("/api/submit-pan", async (req, res) => {
  try {
    const { aadhaar, orgType, pan, panName, panDob, panConsent } = req.body;
    if (!aadhaar || !orgType || !pan || !panName || !panDob) {
      return res.status(400).json({ error: "All PAN fields are required" });
    }

    // PAN format validation: ABCDE1234F
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      return res.status(400).json({ error: "Invalid PAN format" });
    }

    await panCollection.insertOne({
      aadhaar,
      orgType,
      pan,
      panName,
      panDob,
      panConsent: !!panConsent,
      createdAt: new Date(),
    });

    res.json({ ok: true, message: "PAN details saved successfully" });
  } catch (err) {
    console.error("❌ PAN submission failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/submit", async (req, res) => {
  const errors = validateAgainstSchema(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  try {
    const result = await registrationsCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.json({ ok: true, id: result.insertedId });
  } catch (err) {
    console.error("❌ DB save failed:", err);
    res.status(500).json({ message: "DB save failed" });
  }
});

// ✅ Export for Vercel serverless
module.exports = app;
module.exports.handler = serverless(app);
