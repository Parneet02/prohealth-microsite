# ProHealth microsite — handover

Everything the deployment team needs to run this on AWS with a MongoDB of
their choosing. Written against the code in this repo, not a plan for it.

## What it does

A member opens the Habit Health app, taps the Care Plans banner, and the app
loads this microsite in a webview or an iframe. The member picks a plan,
fills one form, and two things happen: the lead lands in MongoDB, and the
care plan team gets an email so they can call the member back. The member can
then download or view the plan's PDF flyer.

It is an interest capture page. There is no login, no payment, no CRM.

## Request flow

```
Habit Health app
  └─ iframe / webview  →  GET /                       microsite page
                          POST /api/events            funnel counters (fire and forget)
                          POST /api/leads             ← the one that matters
                             1. validate (lib/validate.js)
                             2. rate limit by hashed IP
                             3. de-duplicate: same email + plan within 24h
                             4. INSERT into `leads`
                             5. send mail, then record the result on the lead
                          GET /api/brochure/:plan?lead=<id>
                             logs a `brochure_download` event, increments the
                             lead's counter, streams the PDF
Care plan team
  └─ GET /admin  (token)  →  /api/admin/leads, /api/admin/export (CSV)
```

The order in step 4/5 is deliberate and must stay that way: **the lead is
written before the email is attempted.** If SMTP is down the member still sees
success, the lead is safe, and `notification.sent: false` records what
happened. A mail outage must never cost a registration.

## Data model

Database: `prohealth` (`MONGODB_DB`). Two collections, no schema enforcement —
these are the fields the code actually writes.

### `leads` — one document per registration, never auto deleted

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | also the member's reference number in the emails |
| `fullName` | string | trimmed, max 80 |
| `mobile` | string | 10 digits, validated `^[6-9]\d{9}$` |
| `empId` | string | employee ID, max 40 |
| `email` | string | lowercased, max 120 |
| `location` | string | max 80 |
| `service` | string | must match a name in `lib/programs.js` |
| `programKey` | string | `plus` \| `diet` \| `lab` |
| `status` | string | `new` on insert; the team's own workflow field |
| `source` | string | `habit-health-app` |
| `utm` | object | `source`/`medium`/`campaign`/`content`, when present on the URL |
| `ipHash` | string | salted SHA-256, first 32 chars. **The raw IP is never stored** |
| `userAgent`, `referer` | string | truncated to 300 |
| `notification` | object | `{ sent, to[], acknowledged, at, reason?, error? }` |
| `brochureDownloads` | number | incremented by the download route |
| `lastDownloadAt` | Date | |
| `createdAt`, `updatedAt` | Date | |

### `events` — funnel activity, expires after 90 days

`type` (`page_view`, `programs_view`, `flyer_view`, `form_open`,
`brochure_download`), `programKey`, `service`, `leadId`, `email`, `ipHash`,
`userAgent`, `createdAt`.

### Indexes

Created by `node --env-file=.env.local scripts/create-indexes.mjs`. Run it
once per database — it is idempotent, so re-running after a restore is safe.

```
leads:  createdAt_desc            { createdAt: -1 }
        dedupe_lookup             { email: 1, service: 1, createdAt: -1 }   ← the 24h duplicate check
        service_createdAt         { service: 1, createdAt: -1 }
        rate_limit                { ipHash: 1, createdAt: -1 }
        mobile                    { mobile: 1 }
events: createdAt_desc, type_createdAt, leadId
        ttl_90_days               { createdAt: 1 }, expireAfterSeconds 7776000
```

Add a query pattern, add its index in that script in the same change.

## API

| Method | Path | Auth | Returns |
|---|---|---|---|
| POST | `/api/leads` | none | `200` `{ ok, id, flyerUrl, duplicate? }`, `422` `{ errors }`, `429`, `503` |
| POST | `/api/events` | none | `200 { ok }`, `400` on an unknown type |
| GET | `/api/brochure/:program` | none | the PDF, `404` unknown plan |
| GET | `/api/admin/leads` | token | `{ total, counts, downloads, rows }` |
| GET | `/api/admin/export` | token | CSV |
| GET | `/api/health` | none | `200`/`503` plus a per setting report |

Admin auth is the `x-admin-token` header (or `?token=`) matched against
`ADMIN_TOKEN`. It is a shared secret, not a user system — keep the admin page
off the public menu and rotate the token when someone leaves.

`/api/leads` responses never leak whether an email already exists beyond the
`duplicate` flag on an identical submission, and the honeypot (`company`)
returns a normal-looking success so bots do not retry.

## Environment variables

Full list with notes in `.env.example`. Required:

```
MONGODB_URI              connection string (SRV or standard)
MONGODB_DB               prohealth
SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS
MAIL_FROM                e.g. ProHealth Programs <careplan-noreply@hclhealthcare.in>
NOTIFY_EMAILS            comma separated, always notified
ADMIN_TOKEN              long random string
IP_HASH_SALT             random, and stable — changing it re-buckets rate limiting
ALLOWED_FRAME_ANCESTORS  who may embed the page (see below)
```

Optional: `NOTIFY_EMAILS_PLUS|_DIET|_LAB` (per plan routing, added on top of
`NOTIFY_EMAILS`), `NOTIFY_CC`, `SEND_USER_ACK` (member confirmation mail),
`NOTIFY_ON_DOWNLOAD`.

Two things that bite:

- `ALLOWED_FRAME_ANCESTORS` needs the CSP source list **inside double
  quotes**, because the value itself contains single quotes:
  `ALLOWED_FRAME_ANCESTORS="'self' https://app.hclhealthcare.in"`. Written
  bare, the shell or dotenv parser eats the quotes and the header degrades to
  `frame-ancestors self` — which then blocks the app.
- It is read when the server starts (it becomes a response header in
  `next.config.mjs`), so changing it needs a restart or redeploy.

## Embedding in the Habit Health app

- Set `ALLOWED_FRAME_ANCESTORS` to the origin of the **page that contains the
  iframe**, not the app's package name. Anything else is refused by the
  browser with `Refused to frame … an ancestor violates …`.
- `/admin` is `frame-ancestors 'none'` and cannot be embedded anywhere.
- The page posts `{ type: 'prohealth:height', height }` to the parent on every
  layout change. `embed-example.html` is a working host page — copy the
  listener from it, and check `event.origin` as it does.
- If the app sandboxes the iframe, `allow-downloads` is required or the PDF
  button fails silently on Android.
- A plain webview that loads the URL directly is not an iframe, so the page
  cannot detect it. Append `?embed=1` to the URL in that case; it hides the
  microsite's own header and tab bar so the app's chrome is not doubled.

## Deploying on AWS

The app is a standard Next.js 14 server. Nothing in it is Vercel specific:
`npm ci && npm run build && npm start` (port 3000, `PORT` to change it).

- **Runtime:** Node 18+. App Runner, ECS/Fargate behind an ALB, or Elastic
  Beanstalk all work. Keep at least one warm instance — the first request
  after a cold start pays for the MongoDB handshake.
- **The PDF flyers are read from disk** at `assets/flyers/` by the download
  route, so they must be in the deployed image. They are in the repo; do not
  move them to S3 without changing `app/api/brochure/[program]/route.js`.
- **MongoDB:** Atlas or DocumentDB. The driver caches one client on the global
  object, so a container serves many requests on one pool. If DocumentDB is
  used, TLS needs the RDS CA bundle in `MONGODB_URI` (`tls=true&
  tlsCAFile=…`) and `retryWrites=false`.
- **SMTP:** SES works — create SMTP credentials (not the API key), port 587,
  verify `MAIL_FROM`, and move the account out of the SES sandbox or mail to
  unverified recipients is silently dropped.
- **Secrets** belong in Parameter Store or Secrets Manager, injected as
  environment variables. Nothing goes in the repo.
- **Health check:** point the load balancer at `/api/health`. It returns 503
  when the database is unreachable, which is the right thing to fail on.
- **Logs:** the app never logs names, emails, mobiles or employee IDs. Keep it
  that way — a stray `console.log(lead)` in this code is a PII leak into
  CloudWatch.

## Verifying a deployment

```bash
BASE_URL=https://your-host ADMIN_TOKEN=… node scripts/smoke-test.mjs
```

Fifteen checks: health, validation, honeypot, lead storage, 24h de-duplication,
PDF download and filename, download counting, the admin token gate, and that
the notification email was accepted by the mail server. It registers a real
"Smoke Test" lead, so run it against staging or delete the row afterwards.

For local work without credentials, `node scripts/dev-smtp.mjs` is a throwaway
SMTP server on port 1025 that prints and saves whatever the app sends.

## Operational notes

- **Rate limiting** is 6 submissions per hashed IP per 10 minutes, counted in
  MongoDB (`lib/request.js`). Behind a load balancer the client IP comes from
  `x-forwarded-for`, so the ALB must be configured to pass it or every member
  shares one bucket.
- **De-duplication** is same email + same plan within 24 hours. A member
  registering for a second plan is correctly a second lead.
- **`notification.sent: false`** on recent leads is the signal that mail
  broke. The leads are still there; the team just has not been told about
  them. Worth an alert.
- **`lib/programs.js` is the single source of truth** for plan names, pricing,
  inclusions and flyer filenames. The API validates the submitted plan against
  it, so a price change is a one file change — but any lead already stored
  keeps the old plan name string.
