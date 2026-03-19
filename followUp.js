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
  throw new Error("Vishal_Kumar_Resume.pdf not found");
}

const DELAY_MS = 420 * 1000; // 7 minutes between emails
const BATCH_SIZE = 25;

// SMTP bounce codes — these mean the address is bad/unreachable
const BOUNCE_CODES = ["550", "551", "552", "553", "554"];

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL, pass: PASSWORD },
});

function buildFollowUp() {
  return `Hi,

Just following up on my application sent earlier. Still very interested — happy to connect at your convenience.

askvishal.in | github.com/rajput-vishal01 | linkedin.com/in/askvishal01

Best regards,
Vishal Kumar
askvishal.me@gmail.com`;
}

function isBounceError(err) {
  const msg = err.message || "";
  return BOUNCE_CODES.some((code) => msg.includes(code));
}

function saveProgress(rows) {
  // Quote headers too — company names etc. may contain commas
  const headers = Object.keys(rows[0])
    .map((h) => `"${h.replace(/"/g, '""')}"`)
    .join(",");
  const data = rows
    .map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  fs.writeFileSync(FILE, headers + "\n" + data);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];

fs.createReadStream(FILE)
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    if (rows.length === 0) {
      console.log("No rows found in CSV.");
      return;
    }

    // Ensure follow-up columns exist on all rows
    for (const row of rows) {
      if (!("FollowUpStatus" in row)) row.FollowUpStatus = "";
      if (!("FollowUp Sent" in row)) row["FollowUp Sent"] = "";
      if (!("FollowUp Reason" in row)) row["FollowUp Reason"] = "";
    }

    let attemptCount = 0;

    for (const row of rows) {
      if (attemptCount >= BATCH_SIZE) break;

      const email = row["Email"]?.trim();
      const status = row["Status"]?.trim();
      const followUpStatus = row["FollowUpStatus"]?.trim();

      // Only follow up on successfully sent original emails
      if (status !== "SENT") continue;

      // BOUNCED = permanent, never retry
      // SENT = already done, skip
      // FAILED = transient error, retry
      if (followUpStatus === "SENT" || followUpStatus === "BOUNCED") continue;

      if (!email) continue;

      try {
        await transporter.sendMail({
          from: EMAIL,
          to: email,
          subject: `Re: SDE / Backend Candidate — Vishal Rajput`,
          text: buildFollowUp(),
          attachments: [{ filename: "Vishal_Kumar_Resume.pdf", path: RESUME_PATH }],
        });

        row.FollowUpStatus = "SENT";
        row["FollowUp Sent"] = new Date().toISOString();
        row["FollowUp Reason"] = "";
        console.log(`Follow-up sent → ${email}`);
      } catch (err) {
        if (isBounceError(err)) {
          row.FollowUpStatus = "BOUNCED";
          console.log(`Bounced → ${email} | ${err.message}`);
        } else {
          row.FollowUpStatus = "FAILED";
          console.log(`Failed → ${email} | ${err.message}`);
        }

        row["FollowUp Sent"] = new Date().toISOString();
        row["FollowUp Reason"] = err.message;
      }

      attemptCount++;
      saveProgress(rows);

      if (attemptCount < BATCH_SIZE) {
        const jitter = Math.floor(Math.random() * 60000);
        await wait(DELAY_MS + jitter);
      }
    }

    const sent = rows.filter((r) => r.FollowUpStatus === "SENT").length;
    const bounced = rows.filter((r) => r.FollowUpStatus === "BOUNCED").length;
    const failed = rows.filter((r) => r.FollowUpStatus === "FAILED").length;
    const pending = rows.filter(
      (r) => r.Status === "SENT" && !["SENT", "BOUNCED", "FAILED"].includes(r.FollowUpStatus)
    ).length;

    console.log(`\n── Run complete ──────────────────`);
    console.log(`Attempted this run : ${attemptCount}`);
    console.log(`Total follow-ups sent  : ${sent}`);
    console.log(`Total bounced          : ${bounced}`);
    console.log(`Total failed (retry)   : ${failed}`);
    console.log(`Still pending          : ${pending}`);
    console.log(`─────────────────────────────────`);
  });