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
const RESUME_PATH = "./resume.pdf";

if (!fs.existsSync(FILE)) {
  throw new Error("emails.csv not found");
}

if (!fs.existsSync(RESUME_PATH)) {
  throw new Error("resume.pdf not found");
}

const DELAY_MS = 120 * 1000; // 2 min between emails
const BATCH_SIZE = 40; // max ATTEMPTS per run

// Behavior:
// Sends 1 email → waits 2 minutes → sends next
// Repeats until 40 emails are sent, then stops
// Does NOT send 40 emails in 2 minutes
// Choose values carefully to avoid SMTP/Gmail limits

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL, pass: PASSWORD },
});

const rows = [];

async function sendMail(to, company) {
  const subject = "Application for Software Developer Role";

  const body = `
Dear ${company} Team,

I hope you are doing well.

I am applying for Software Developer opportunities at ${company}.
Please find my resume attached.

Best regards,
Your Name
Phone: XXXXXXXX
  `;

  await transporter.sendMail({
    from: EMAIL,
    to,
    subject,
    text: body,
    attachments: [{ filename: "Resume.pdf", path: RESUME_PATH }],
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

  fs.writeFileSync(FILE, headers + "\n" + data); // overwrite same file
}

// Read CSV
fs.createReadStream(FILE)
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    let attemptCount = 0; // counts success + failure

    if (rows.length === 0) {
      console.log("No rows found");
      return;
    }

    for (const row of rows) {
      if (attemptCount >= BATCH_SIZE) break;

      const email = row["Email"]?.trim();
      const company = row["Company / Org"]?.trim() || "Hiring Team";

      if (!email) continue;

      // Skip already processed rows
      if (row.Status?.trim() === "SENT" || row.Status?.trim() === "FAILED")
        continue;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        row.Status = "FAILED";
        row.Reason = "Invalid email format";
        row["Last Sent"] = new Date().toISOString();
        saveProgress(rows);
        attemptCount++;
        continue;
      }

      try {
        await sendMail(email, company);

        row.Status = "SENT";
        row.Reason = "";
        console.log("Sent →", email);
      } catch (err) {
        row.Status = "FAILED";
        row.Reason = err.message;
        console.error(err);
        console.log("Failed →", email);
      }

      row["Last Sent"] = new Date().toISOString();

      attemptCount++;
      saveProgress(rows);

      const jitter = Math.floor(Math.random() * 60000); // up to +60s --for randomness
      await wait(DELAY_MS + jitter);
    }

    console.log(`Run complete. Attempts: ${attemptCount}`);
  });
