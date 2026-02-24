## Automated Email Outreach System (Node.js + Gmail)

Lightweight script to send personalized emails with attachments to multiple recipients using Gmail SMTP. Built for cold outreach with batching, tracking, and duplicate prevention.

## Features

- Reads recipients from a CSV file
- Personalizes email content (e.g., company name)
- Attaches a resume automatically
- Configurable delay between emails
- Batch sending to reduce Gmail throttling
- Tracks SENT / FAILED status
- Skips already processed entries
- Logs errors and timestamps
- Safe to resume if interrupted (progress saved after each email)

## Project Structure

```
email-automation/
│
├── emails.csv          # Input + progress tracking file
├── resume.pdf          # Attachment sent to all recipients
│
├── sendEmails.js       # Main script
├── package.json
├── package-lock.json
├── .env                # Credentials (not committed)
│
└── .github/workflows/send.yml   (optional automation)
```

## Requirements

- Node.js 18+
- Gmail account
- Gmail App Password

## Gmail Setup (App Password)

1. Enable 2-Step Verification in your Google account
2. Go to Security → App Passwords
3. Create a password for Mail → Other (custom name)
4. Copy the generated 16-character password (no spaces)
5. Use this in your `.env` file

If authentication fails, disable “Skip password when possible” in Google security settings.

## Installation

```bash
npm install
```

Dependencies:

- nodemailer
- csv-parser
- dotenv

## Environment Variables

Create a `.env` file in the project root:

```
GMAIL_USER=yourgmail@gmail.com
GMAIL_PASS=your_app_password
```

Do not commit this file.

## Recipient List (CSV)

Name the file:

```
emails.csv
```

Required columns:

```
Sr,Company / Org,Role Mentioned,Relevance for Developer,Email,Website,Notes,Status,Reason,Last Sent
```

Leave the last three fields empty initially. The script updates these fields during execution.

## Run

```bash
node sendEmails.js
```

## Testing

Before sending at scale, test with a few entries or your own email to verify:

- Email formatting
- Attachment delivery
- Spam placement
- Status tracking

## Output / Progress Tracking

The script updates the same `emails.csv` file after each attempt.

Updated fields:

- Status → SENT / FAILED
- Reason → Error message (if failed)
- Last Sent → Timestamp

## Resume Behavior

Entries marked as SENT or FAILED are skipped automatically. You can safely rerun the script at any time.

## Configuration

Edit in `sendEmails.js`:

```js
const DELAY_MS = 120 * 1000; // delay between emails
const BATCH_SIZE = 40; // max attempts per run
```

Adjust according to Gmail limits.

## Gmail Sending Limits (Personal Accounts)

Typical safe ranges for cold outreach:

- Day 1: 20–30 emails
- Day 2: 40–60 emails
- Day 3+: up to ~100 per day

Exceeding limits may trigger temporary restrictions.

## Common Issues

App password not working

- Ensure 2FA is enabled
- Use the app password, not your Gmail password

`.env` not loading

- File name must be exactly `.env`
- Place it in the project root
- Do not use quotes around values

CSV not opening

- Export as a true CSV file
- Do not rename an `.xlsx` file

## Security

- Never share your `.env` file
- Do not commit credentials
- Revoke the app password if compromised

## License

Personal and educational use.

## Author

Portfolio: [https://askvishal.in](https://askvishal.in)
GitHub: [https://github.com/rajput-vishal01](https://github.com/rajput-vishal01)
Email: [askvishal.me@gmail.com](mailto:askvishal.me@gmail.com)
