# AgriXport India 2027

Conference and registration website for AgriXport India 2027 — Building Global Trust: Safe Food, Global Reach.
The event takes place on 26–27 February 2027 in Pune, Maharashtra, India.
Plain HTML, CSS and vanilla JavaScript serve the site; Vercel Functions handle registrations and CSV downloads.
Supabase stores registrations, Resend sends confirmations, and Vitest with jsdom tests the code.

## Folder structure

```text
public/
  index.html
  css/ base.css, layout.css, sections.css, form.css
  js/ config.js, carousel.js, audience-toggle.js, form-validation.js, form-submit.js
  assets/ logo/, qr/
api/ register.js, export-csv.js
lib/ db.js, validate.js, rate-limit.js, send-email.js, csv.js
  email-templates/ escape-html.js, delegate.js, sponsor.js
db/ schema.sql
scripts/ generate-qr.js
tests/
  setup.test.js
  dom/ page content, carousel, audience toggle, form fields, validation and submission tests
  lib/ database, validation, rate limit, email, CSV and QR tests
  api/ register.test.js, export-csv.test.js
.env.example
package.json
vercel.json
README.md
```

## Install and test

Use Node.js 22 or a newer supported LTS version. Run commands from the directory containing package.json.

```sh
npm install --package-lock=false
npm test
```

Tests mock external services and do not require real credentials or send real emails.
Run a single file with `npm test -- tests/api/register.test.js`.
Serve public/ over HTTP for a static preview; opening index.html with file:// does not support its module scripts.
A static preview does not run /api; use a Vercel deployment to test the complete registration flow.

## Environment variables

The complete variable list is in .env.example. Configure values in Vercel Project Settings → Environment Variables.

| Variable | Value and purpose |
| --- | --- |
| SUPABASE_URL | Supabase project URL used by server functions. |
| SUPABASE_SERVICE_KEY | Supabase server secret key, or service_role key, with privileged database access. |
| RESEND_API_KEY | Resend API key used to send confirmation emails. |
| FROM_EMAIL | Sender address on a verified Resend domain; may include a display name. |
| ADMIN_EXPORT_TOKEN | Long, randomly generated secret protecting the registration desk and CSV downloads. |
| SITE_URL | Canonical HTTPS origin, such as https://YOUR-DOMAIN; used in emails and QR generation. |
| EMAIL_PROVIDER | resend (default) or gmail for Gmail SMTP testing. |
| GMAIL_USER | Gmail sender account when EMAIL_PROVIDER=gmail. |
| GMAIL_APP_PASSWORD | Private Google App Password for that account; never a normal login password. |

Keep privileged keys and the export token in server environment variables, outside public/ and source control.
The QR script reads SITE_URL from the shell environment; it does not automatically load .env files.

## Create the Supabase schema

1. Create or select the intended Supabase project.
2. Open its SQL Editor, start a query, and paste the complete contents of db/schema.sql.
3. Run the query once in a new database; the script creates the table and is not designed for repeated execution.
4. Confirm public.registrations exists and row-level security is enabled with no public policies.
5. Set SUPABASE_URL and SUPABASE_SERVICE_KEY for the corresponding project in Vercel.

The schema creates UUID registration IDs and timestamps. Public clients have no table policies;
server functions use the privileged key for inserts and exports.
See the [Supabase SQL Editor workflow](https://supabase.com/docs/guides/ai/examples/nextjs-vector-search#prepare-the-database).

## Deploy on Vercel

1. Import the GitHub repository into a Vercel project.
2. Set Root Directory to the folder containing package.json and vercel.json: repository root for this project.
3. Choose the Other framework preset, skip the build command, and use public as Output Directory.
4. Keep api/ alongside public/ so Vercel deploys the server functions. vercel.json supplies the static configuration.
5. Add the required environment variables for Production and any Preview environments you will test.
6. Verify the FROM_EMAIL domain in Resend and create the sending API key.
7. Deploy, add the intended domain, and set SITE_URL to its HTTPS origin.
8. Redeploy after changing environment variables; generate the final QR and include its assets in a subsequent deployment.
9. Complete the manual checklist below before sharing the registration link.

/register redirects to /#register. Registration submissions use POST /api/register.
A saved registration still returns success if its confirmation email fails; check function logs for the registration ID.
The in-memory rate limiter permits five submissions per IP per ten minutes per function instance.

References: [Vercel build settings](https://vercel.com/docs/builds/configure-a-build),
[Vercel environment variables](https://vercel.com/docs/environment-variables),
[Resend domain verification](https://resend.com/blog/new-domain-verification-experience).

## Email testing with other recipients

In Vercel, set EMAIL_PROVIDER=gmail, GMAIL_USER to your Gmail account, and GMAIL_APP_PASSWORD to a Google App Password.
Enter the App Password privately in Vercel, never in source code or chat. Redeploy after saving the variables.
Gmail confirmations use GMAIL_USER as the sender; the existing FROM_EMAIL remains for Resend.
Gmail test emails use info@synergytechnofin.com as reply-to. Gmail sending limits and account security checks still apply.
See [Nodemailer Gmail setup](https://nodemailer.com/guides/using-gmail) for App Password requirements.
Without these Gmail settings, keep EMAIL_PROVIDER=resend; onboarding@resend.dev only supports the Resend account recipient.
For production, verify agrixportindia.com in Resend, set EMAIL_PROVIDER=resend and set FROM_EMAIL to AgriXport India 2027 <registrations@agrixportindia.com>.
Production Resend confirmations route replies to khurana.v@synergytechnofin.com.
A 200 registration response includes email_sent: true when the mail service accepts it, or false if sending fails.
Acceptance is not proof of inbox delivery. A send failure leaves the registration saved and the page explains that email was not sent.
Delegate packages/messages and Sponsor categories are excluded from saved payloads and from reads for existing admin/CSV records.
Historical database rows are not rewritten; irrelevant values are suppressed when displayed or exported.
The live website is the version with seven supplied conference photos in the previous-event gallery.
The dashboard is /admin.html. Its registration API and CSV downloads require HTTP Basic authentication over HTTPS.
Use username admin and the password configured as ADMIN_EXPORT_TOKEN; the password stays on the server.
Before public launch, replace the old test token with a long random secret in Vercel and redeploy.
Browser credentials may remain cached until the browser session closes; use a private window on shared computers.
Use dummy data until the production password and final launch checks are complete.

## Download registrations as CSV

Sign in at /admin.html, choose All registrations, Delegate or Sponsor, and select Download CSV.
The download uses the same browser authentication as the registration desk.
The old /api/export-csv endpoint returns 410 Gone. Use the registration desk for CSV downloads.
The attachment is named registrations-YYYY-MM-DD.csv using the UTC download date, with newest registrations first.
Columns are created_at, audience, prefix, full_name, designation, mobile, email, organisation, category, package, message.
Timestamps in cells use IST (YYYY-MM-DD HH:mm). The CSV includes a UTF-8 BOM, quoted cells and formula protection.

## Regenerate the registration QR

Generate the QR for the production registration page:

```sh
SITE_URL="https://www.agrixportindia.com" npm run qr
```

This encodes https://www.agrixportindia.com/register and writes public/assets/qr/register.svg and register.png.
Options: 1024px, margin 4, error correction H, dark #BC0A08 and light #FFFFFF.
Include both generated files in source control and redeploy before distributing them.
Regenerate both files whenever the canonical domain changes.

## Manual launch checklist

- [ ] Scan the final QR on iOS; confirm it opens the deployed registration section.
- [ ] Scan the final QR on Android; confirm the same destination.
- [ ] Submit one Delegate registration and confirm the saved details in Supabase.
- [ ] Submit one Sponsor registration and confirm the package and message in Supabase.
- [ ] Confirm both confirmation templates arrive in Gmail inboxes, not spam.
- [ ] Confirm both confirmation templates arrive in Outlook inboxes, not junk; repeat submissions as needed for both providers.
- [ ] Check names, enquiry details, event details and website links in the received emails.
- [ ] Download the CSV and confirm its columns, IST timestamps, accents and ₹ render correctly in Excel.
- [ ] Download each audience-filtered CSV and confirm the filter is respected.

## Search and sharing

The canonical homepage is https://www.agrixportindia.com/.
Search descriptions, Open Graph/Twitter previews and Event JSON-LD are in public/index.html.
The sharing image uses the existing event logo; individual platforms may crop or cache it.
public/sitemap.xml lists the homepage; public/robots.txt excludes API routes from crawling.
The admin page has noindex metadata; API authentication, rather than robots.txt, protects registration data.
Public paths on agriexport-six.vercel.app redirect to the same paths on the production domain.
Set SITE_URL in Vercel to https://www.agrixportindia.com for email links. It does not rewrite the static metadata.
Add the confirmed venue name and street address to the visible page and JSON-LD when available.
Dates are date-only until session times are confirmed; no unconfirmed prices or speakers are included in the markup.
Validate the event using https://search.google.com/test/rich-results and resolve venue-related issues before promotion.
Verify the final domain in Google Search Console, submit /sitemap.xml, and inspect the homepage URL.
Search and social platforms decide when to crawl or refresh previews; metadata does not guarantee rankings or rich results.
