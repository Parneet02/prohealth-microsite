# CLAUDE.md

Context for Claude Code working in this repo. Read this before making changes.

## What this is

Interest capture microsite for three HCL Healthcare care plans (ProHealth Plus, Diet, Lab). It is embedded in the Habit Health mobile app through an iframe. It is not a CRM. Its only jobs are: show the programs, capture a lead, email the care team, and hand over the flyer PDF.

Scope discipline matters here. If a request would turn this into a CRM, a login system, a payment flow, or a content management system, say so before building it.

## Stack

- Next.js 14, App Router, JavaScript (no TypeScript in this repo, do not introduce it without being asked)
- MongoDB Atlas via the official `mongodb` driver, no ORM
- Nodemailer over SMTP
- Deployed on Vercel, frontend and API in one project
- No CSS framework. Plain CSS in `app/globals.css`

## Commands

```bash
npm install
npm run dev                                      # local at :3000
npm run build                                    # must pass before any commit
node --env-file=.env.local scripts/create-indexes.mjs   # one time per database
```

There is no test runner yet. Verify with `npm run build` plus the manual checklist below.

## File map

```
app/page.js                       microsite: banner, program cards, form, flyer panel
app/admin/page.js                 token gated dashboard
app/api/leads/route.js            lead capture, dedupe, email trigger
app/api/brochure/[program]/       download logging plus PDF stream
app/api/events/route.js           funnel counters
app/api/admin/leads|export/       list and CSV, both token guarded
app/globals.css                   approved design, ported from the client prototype
lib/programs.js                   program catalogue, single source of truth
lib/mongodb.js                    cached Atlas client for serverless
lib/mailer.js                     SMTP transport, recipient routing, templates
lib/validate.js                   server side rules
lib/request.js                    IP hashing, rate limit, JSON helper
lib/auth.js                       admin token check
assets/flyers/*.pdf               source PDFs, served by the API, not public
public/flyers/*.jpg               preview images shown in the UI
```

## Invariants

Do not break these without flagging it first.

1. **The design in `globals.css` is client approved.** Change layout or colour only when explicitly asked. Add new styles at the bottom of the file under the additions comment rather than editing the ported block.
2. **`lib/programs.js` is the single source of truth.** Program names, pricing, inclusions and flyer file names live there and nowhere else. The API validates the submitted program against this list, so never accept a free text service name.
3. **The lead is written before the email is attempted.** Mail failures must be caught, recorded on the lead document, and never returned as an error to the member. A registration is never lost because SMTP is down.
4. **Every client side validation rule has a server side twin** in `lib/validate.js`. The form can be bypassed with a direct POST.
5. **Never store raw IPs or log PII.** IPs are salted and hashed in `lib/request.js`. Do not add `console.log` of names, emails, mobiles or employee IDs.
6. **No browser storage for lead data.** The webview partitions storage unpredictably. Server is the only source of truth.
7. **Downloads go through `/api/brochure/[program]`,** not a static link, because that request is what records the download. Do not replace it with a direct file link.
8. **Secrets come from environment variables only.** Nothing goes in the repo, not even a placeholder that looks real.

## Iframe constraints

The site runs inside the Habit Health app, so:

- `ALLOWED_FRAME_ANCESTORS` drives the CSP `frame-ancestors` header in `next.config.mjs`. It is read at build time, so a change needs a redeploy.
- The page posts `{ type: 'prohealth:height', height }` to the parent on every layout change. Keep that working when editing `app/page.js`.
- If the parent sandboxes the frame, `allow-downloads` is required or the PDF button fails silently on Android. See `embed-example.html`.
- Avoid anything that needs a popup, a new window, or third party cookies.

## Conventions

- Functional React components, hooks, `'use client'` only where interactivity needs it
- API routes: `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`
- Return errors through the `json()` helper in `lib/request.js` so `Cache-Control: no-store` is always set
- User facing copy is plain and active: "Register and get my flyer", not "Submit". Errors say what to fix
- Comments explain why, not what. Do not narrate obvious code
- Keep dependencies minimal. Ask before adding a package

## Manual verification checklist

Run through this after any change to the capture flow:

- `npm run build` passes with no new warnings
- Banner to programs to form to success flow works on a 380px viewport
- Submitting an empty form shows one error per field, no console errors
- `curl -X POST /api/leads` with a bad payload returns 422 and per field errors
- `curl -X POST /api/leads` with a valid payload returns 200, the document appears in MongoDB, and the notification email arrives
- Submitting the same email and program twice within a day creates one lead, not two
- The download button returns the correct PDF with the right filename and increments `brochureDownloads`
- `/api/admin/leads` without a token returns 401
- `/api/health` reports `database: connected` and each setting as configured

## Environment variables

See `.env.example` for the full list with notes. Required for the app to function: `MONGODB_URI`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `NOTIFY_EMAILS`, `ADMIN_TOKEN`, `IP_HASH_SALT`, `ALLOWED_FRAME_ANCESTORS`.

## Data model

`leads`: one document per registration, never auto deleted. `events`: funnel activity, TTL 90 days. Both are indexed by `scripts/create-indexes.mjs`. If you add a query pattern, add the matching index in that script in the same change.
