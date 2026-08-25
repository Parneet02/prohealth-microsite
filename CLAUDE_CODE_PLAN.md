# Build plan for Claude Code

The scaffold in this repo already builds and runs. The work left is wiring it to real infrastructure and hardening it. This document is the running order, with the prompts to paste and what to check after each one.

## Before you open Claude Code

Three things need a human, and Claude Code cannot do them for you.

1. **MongoDB Atlas.** Create a free M0 cluster. Add a database user with `readWrite` on the `prohealth` database only. Under Network Access allow `0.0.0.0/0`, because Vercel functions do not have fixed IPs. Copy the SRV connection string.
2. **SMTP account.** Get credentials for the sending mailbox. An HCL Office 365 mailbox with an app password is the least friction. Confirm with IT that the account is allowed to relay, because this is the step that usually stalls for a week.
3. **Vercel and GitHub.** Create an empty GitHub repo. Create the Vercel account and connect it to GitHub.

Decide two things now so you are not rewriting later:
- Which addresses go in `NOTIFY_EMAILS`, and whether any program needs its own owner.
- Whether members get a confirmation email (`SEND_USER_ACK`). If yes, legal or marketing should approve the wording in `lib/mailer.js`.

## Install and start

Claude Code needs Node.js installed. Node 22 or later is recommended for the current version.

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

Then:

```bash
unzip prohealth-microsite.zip
cd prohealth-microsite
git init && git add -A && git commit -m "Scaffold: microsite, lead API, email trigger"
claude
```

Claude Code reads `CLAUDE.md` automatically on start, so it picks up the constraints without you restating them.

Docs if you get stuck: https://code.claude.com/docs/en/setup

## Session 1: get it running locally

Prompt:

> Read CLAUDE.md, then walk me through getting this running locally. Create .env.local from .env.example and ask me for each value one at a time rather than inventing placeholders. Once it is filled in, run the index script, start the dev server, and confirm /api/health reports the database as connected.

Check: `/api/health` returns `database: connected`. The homepage renders the three cards.

Stop and fix this before anything else. Everything downstream assumes the database works.

## Session 2: prove the full flow end to end

Prompt:

> Register a test lead through the running site, then verify three things and report what you find: the document written to MongoDB has the expected shape, the notification email arrived at the address in NOTIFY_EMAILS, and the download button returns the right PDF and increments brochureDownloads. If the email failed, diagnose it from the stored notification field on the lead rather than guessing.

Check: a real email in a real inbox. This is the whole point of the project, so do not take a passing build as evidence it works.

Common failure: Office 365 rejects the send because `MAIL_FROM` is not an address the SMTP user may send as. The two must match, or the mailbox needs send-as permission.

## Session 3: deploy

Prompt:

> Help me deploy to Vercel. Walk me through pushing to GitHub and importing the project, then list exactly which environment variables to set in the Vercel dashboard and for which environments. After the first deploy, check /api/health on the deployment URL and tell me what is missing.

Check: `/api/health` on the live URL reports everything configured. Register a test lead against production.

Note that `ALLOWED_FRAME_ANCESTORS` is read at build time, so setting it after the first deploy needs a redeploy to take effect.

## Session 4: the iframe

You need the origin of the page that will hold the iframe from the app team first.

Prompt:

> The Habit Health app will embed this at <origin>. Update ALLOWED_FRAME_ANCESTORS for that origin, then help me test the embed properly: serve embed-example.html pointed at the deployment, confirm the frame loads rather than being blocked by CSP, confirm the height message resizes the frame, and confirm the PDF download works from inside the frame. Tell me what to hand the app team.

Check: open it on a real Android device, not just desktop. The download inside a sandboxed iframe is the thing that breaks, and it breaks silently.

## Session 5: hardening before launch

Only after the flow works. Pick what you actually need.

> Review the lead capture path for anything that would embarrass us at launch: what happens under a burst of traffic, what happens if Atlas is briefly unreachable mid-submit, whether any PII ends up in logs, and whether the rate limit can be trivially bypassed. Propose fixes in priority order before writing any code.

Other candidates, one session each:

- A daily digest email of the previous day's leads, as a Vercel cron route
- A `status` field workflow on `/admin` so the team can mark leads as contacted
- Basic funnel numbers on `/admin`: views, form opens, registrations, downloads, and the drop off between them
- Simple analytics on which program gets the most interest, for the campaign report

## How to work with Claude Code on this repo

**Plan before code on anything touching capture.** Ask for the approach first, agree, then let it build. The lead path has ordering constraints that are easy to break by accident.

**Commit at every working state.** `git commit` after each session that ends green. It makes reverting an experiment free.

**Make it verify, not assert.** "Run the build and the checklist in CLAUDE.md and show me the output" beats accepting "this should work now."

**Push back on scope.** If a request starts growing an admin login or a dashboard framework, stop. This is a two week lead capture page, not a product.

**Feed it real errors.** Paste the actual Vercel function log or browser console output rather than describing the symptom.

## Definition of done

- A member on the app can register and see the flyer without leaving the webview
- Every registration lands in MongoDB and in the care team inbox within a minute
- The team can pull a CSV without asking a developer
- `/api/health` is green on production
- The app team has the iframe snippet and the origin is allowlisted
- Someone other than you knows where `ADMIN_TOKEN` is stored
