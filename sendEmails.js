import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import nodemailer from "nodemailer";

const EMAIL = process.env.GMAIL_USER;
const PASSWORD = process.env.GMAIL_PASS;

if (!EMAIL || !PASSWORD) {
  throw new Error("Missing GMAIL_USER or GMAIL_PASS in .env");
}

const FILE = "emails.csv";
const RESUME_PATH = "./Vishal_Kumar_Resume.pdf";

if (!fs.existsSync(FILE)) {
  throw new Error("emails.csv not found");
}

if (!fs.existsSync(RESUME_PATH)) {
  throw new Error("resume.pdf not found");
}

const DELAY_MS = 420 * 1000; // 7 minutes between emails
const BATCH_SIZE = 10; // 10 per run × 2 runs = 20/day

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL, pass: PASSWORD },
});

const rows = [];

function buildEmail({ name, personalization }) {
  return `Hi ${name},

${personalization}

I’m a final-year B.Tech (AI & Data Science) student seeking SDE / Backend / Full-Stack or Intern roles. I build production-ready apps using Next.js, Node.js, PostgreSQL, and Docker.

If there's a suitable opening, I'd be grateful to be considered. Resume attached.

askvishal.in | github.com/rajput-vishal01 | linkedin.com/in/askvishal01

Best regards,
Vishal Kumar
askvishal.me@gmail.com`;
}

async function sendMail(to, name, personalization) {
  const subject = `SDE / Backend Candidate — Vishal Rajput`;

  const body = buildEmail({ name, personalization });

  await transporter.sendMail({
    from: EMAIL,
    to,
    subject,
    text: body,
    attachments: [{ filename: "Vishal_Kumar_Resume.pdf", path: RESUME_PATH }],
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function saveProgress(rows) {
  const headers = Object.keys(rows[0]).join(",");
  const data = rows
    .map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  fs.writeFileSync(FILE, headers + "\n" + data);
}

// Read CSV
fs.createReadStream(FILE)
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    let attemptCount = 0;

    if (rows.length === 0) {
      console.log("No rows found");
      return;
    }

    for (const row of rows) {
      if (attemptCount >= BATCH_SIZE) break;

      const email = row["Email"]?.trim();
      const name = row["Name"]?.trim() || "Hiring Team";
      const personalization = row["Personalization"]?.trim();

      if (!email) continue;

      // Skip already processed rows
      if (row.Status?.trim() === "SENT" || row.Status?.trim() === "FAILED")
        continue;

      // Skip rows without personalization written yet
      if (!personalization) {
        console.log(`Skipping ${email} — no personalization written`);
        continue;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        row.Status = "FAILED";
        row.Reason = "Invalid email format";
        row["Last Sent"] = new Date().toISOString();
        saveProgress(rows);
        attemptCount++;
        continue;
      }

      try {
        await sendMail(email, name, personalization);
        row.Status = "SENT";
        row.Reason = "";
        console.log("Sent →", email, `(${name})`);
      } catch (err) {
        row.Status = "FAILED";
        row.Reason = err.message;
        console.error(err);
        console.log("Failed →", email);
      }

      row["Last Sent"] = new Date().toISOString();
      attemptCount++;
      saveProgress(rows);

      const jitter = Math.floor(Math.random() * 60000);
      await wait(DELAY_MS + jitter);
    }

    console.log(`Run complete. Attempts: ${attemptCount}`);
  });
