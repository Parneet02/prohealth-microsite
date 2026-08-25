# ProHealth Programs microsite

Interest capture microsite for the HCL Healthcare ProHealth care plans (Plus, Diet, Lab), built to run inside the Habit Health app as an iframe.

Frontend and backend are one Next.js app deployed to Vercel. Data goes to MongoDB Atlas. Every registration triggers an email to the care team. No CRM, no admin build, no queue.

## What it does

1. Member opens the app screen and sees the banner, taps through to the three programs.
2. "View Flyer" shows the flyer preview with no details required.
3. "Register Now" opens the form: name, mobile, employee ID, email, location, program.
4. On submit the lead is stored in MongoDB and an email fires to the configured addresses.
5. The success panel shows the flyer and a download button. The download is served through an API route that records who downloaded what.
6. The team reads leads at `/admin` or pulls a CSV.

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js 14 App Router | One repo and one Vercel project for UI and API |
| Database | MongoDB Atlas (free M0 is enough) | Schemaless leads, native driver, no ORM overhead |
| Email | Nodemailer over SMTP | Works with the existing HCL mailbox, no new vendor |
| Hosting | Vercel | Zero config deploys, preview URLs per branch |

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run indexes                # one time, creates MongoDB indexes
npm run dev                    # http://localhost:3000
```

`npm run indexes` needs the env file loaded:

```bash
node --env-file=.env.local scripts/create-indexes.mjs
```

## Environment variables

Set these in Vercel under Settings, Environment Variables, for Production and Preview.

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas SRV string. Database user needs readWrite on this database only |
| `MONGODB_DB` | no | Defaults to `prohealth` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | yes | Any SMTP account. Port 587 with STARTTLS, or 465 with `SMTP_SECURE=true` |
| `MAIL_FROM` | yes | Must be an address the SMTP account is allowed to send as |
| `NOTIFY_EMAILS` | yes | Comma separated. Everyone here gets every registration |
| `NOTIFY_EMAILS_PLUS` / `_DIET` / `_LAB` | no | Extra recipients for one program only |
| `NOTIFY_CC` | no | Comma separated CC list |
| `SEND_USER_ACK` | no | `true` sends a confirmation to the member |
| `NOTIFY_ON_DOWNLOAD` | no | `true` also emails on brochure download. Noisy, off by default |
| `ADMIN_TOKEN` | yes | Long random string. Guards `/admin` and the CSV export |
| `IP_HASH_SALT` | yes | Random string, kept stable. Used to hash visitor IPs |
| `ALLOWED_FRAME_ANCESTORS` | yes | Origins allowed to embed the site, space separated |

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

## Deploying

1. Push this folder to a new Git repo.
2. Import it in Vercel. Framework preset is detected as Next.js, no build settings to change.
3. Add the environment variables, then deploy.
4. In Atlas, Network Access, allow `0.0.0.0/0`. Vercel functions do not have fixed IPs, so the database user password is the real control. Use a long one.
5. Run `npm run indexes` once against the production URI.
6. Open `https://<your-deployment>/api/health`. It should report `database: connected` and every setting as `configured`.
7. Send a test registration and confirm the email lands.

`ALLOWED_FRAME_ANCESTORS` is read at build time, so change it in Vercel and redeploy for it to take effect.

## Embedding in the Habit Health app

See `embed-example.html`. Short version:

```html
<iframe src="https://<your-deployment>/" style="width:100%;border:0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"></iframe>
```

Three things to get right:

- **Frame ancestors.** The app page origin must be in `ALLOWED_FRAME_ANCESTORS`, otherwise the browser blocks the frame. For a native webview loading a remote page, use that page's origin.
- **Downloads.** If the iframe is sandboxed at all, `allow-downloads` must be in the list. Without it the PDF button does nothing on Android and there is no error to see.
- **Height.** The microsite posts `{ type: 'prohealth:height', height }` to the parent whenever the layout changes. Listen for it and set the iframe height, or you get a scrollbar inside a scrollbar.

## API

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/leads` | POST | none | Validates, stores the lead, triggers the emails |
| `/api/brochure/[program]` | GET | none | Records the download and streams the PDF as an attachment |
| `/api/events` | POST | none | Funnel counters: page view, flyer view, form open |
| `/api/admin/leads` | GET | `x-admin-token` | Leads plus counts for the dashboard |
| `/api/admin/export` | GET | token header or `?token=` | CSV of all registrations |
| `/api/health` | GET | none | Deploy check, reports config state without leaking values |

`/api/leads` responses: `200` with `{ ok: true, id, flyerUrl }`, `422` with per field `errors`, `429` when the same device submits more than six times in ten minutes, `503` when the database is unreachable.

## Data model

**`leads`** one document per registration.

```js
{
  fullName, mobile, empId, email, location,   // form fields
  service, programKey,                        // "ProHealth Plus" / "plus"
  status: 'new',                              // free for the team to update
  brochureDownloads: 0, lastDownloadAt,
  notification: { sent, to, acknowledged, at },
  ipHash, userAgent, referer,                 // IP is hashed, never stored raw
  createdAt, updatedAt
}
```

**`events`** funnel activity, auto deleted after 90 days by a TTL index. Leads are never auto deleted.

Indexes are created by `scripts/create-indexes.mjs`, including the dedupe lookup and the rate limit lookup.

## Behaviour worth knowing before go live

- **Duplicate guard.** The same email registering for the same program within 24 hours returns the existing record instead of creating a second lead. Double taps on a slow network do not spam the inbox.
- **Email never blocks a lead.** The document is written first. If SMTP fails the API still returns success, the failure is stored on the lead, and `/admin` shows the mail column as failed. Nothing is lost.
- **Bot filter.** A hidden field catches scripted posts. Those return `200` with no record, so the bot does not learn it was caught.
- **Server side validation.** The form can be bypassed with a direct POST, so every rule runs again in the API. The program name is checked against the catalogue rather than accepted as free text.
- **Rate limit.** Six submissions per device hash per ten minutes. If the limiter itself errors, registrations are allowed through rather than blocked.
- **Function size.** The flyers are 1 to 3 MB and are streamed by a serverless function, comfortably inside the 4.5 MB response limit. If a future flyer is larger, move the PDFs to `public/flyers/` and have the route redirect after logging.

## Changing the programs

`lib/programs.js` is the only file to edit. Pricing, inclusions, flyer file names and preview images all live there, and both the UI and the API validation read from it. To add a fourth plan: add the object, put the PDF in `assets/flyers/`, and render preview images with

```bash
pdftoppm -jpeg -r 100 assets/flyers/new-plan.pdf public/flyers/newplan
```

## Repo layout

```
app/
  page.js                     microsite (banner, cards, form, flyer)
  admin/page.js               token gated dashboard
  api/leads/route.js          lead capture and email trigger
  api/brochure/[program]/     download tracking and PDF stream
  api/events/route.js         funnel events
  api/admin/                  list and CSV export
  globals.css                 approved design, unchanged
lib/
  programs.js                 program catalogue, single source of truth
  mongodb.js                  cached Atlas client for serverless
  mailer.js                   SMTP transport, routing, templates
  validate.js                 server side rules
  request.js                  IP hashing, rate limit, JSON helper
  auth.js                     admin token check
assets/flyers/                source PDFs served on download
public/flyers/                preview images shown in the UI
scripts/create-indexes.mjs    one time index setup
embed-example.html            iframe snippet for the app team
```

## Privacy note

The database holds employee names, mobile numbers, employee IDs and emails. Keep `ADMIN_TOKEN` out of shared documents, restrict Atlas access to named users, and treat the CSV export as confidential. Visitor IPs are hashed with a salt and the raw address is never written to disk.
