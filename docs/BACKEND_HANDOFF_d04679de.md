# ProConnect: Backend Developer Handoff

**Owner:** Joel Kuffour  **Document date:** 22 November 2026  **Frontend version:** v8 (plain HTML, CSS and JavaScript, no build step)

This document tells you everything you need to build the backend for ProConnect and connect it to the finished frontend. Read sections 1 to 3 first, then use the rest as a reference. Items marked **DECISION** still need an answer from Joel.

---

## 1. What ProConnect is

ProConnect is a directory that connects customers with local professionals (plumbers, electricians, carpenters, painters, masons, and also creatives such as graphic designers and video editors). Customers find a professional and contact them directly on **WhatsApp**. ProConnect does not handle payment for jobs.

**Who uses it**

| Role | Needs an account? | What they do |
|---|---|---|
| Guest / customer | No | Browse, search, open profiles, chat on WhatsApp, send a "job brief", leave feedback through a private link |
| Professional (worker) | Yes | Create a public profile, upload photos, send clients feedback links, pay the monthly fee |
| Admin (Joel and staff) | Yes | Verify profiles, hide fake profiles or feedback, see payments and reports |

**Business model**

- Free for customers.
- Professionals pay **GH₵20 per month** to keep their profile visible.
- **The first month is free** for every new professional.
- Payment is **manual, one month at a time**. Nothing renews automatically (Paystack recurring billing supports cards, not mobile money, and most Ghanaian users pay with mobile money). A professional who does not pay is hidden from search until they pay again.
- Payments go through **Paystack** (mobile money and card).
- Joel wants to be able to change the price and trial length in one place.

## 2. How the frontend and backend connect

The frontend is three files plus assets: `index.html`, `styles.css`, `app.js` (plus `manifest.webmanifest`, icons and logos). It is a single-page app with no framework and no build step.

All backend calls go through **three adapter objects near the top of `app.js`: `AUTH`, `BILLING` and `REVIEWS`.** Every function returns a Promise. Today they reject with `NOT_CONNECTED`, and the interface shows an honest "not connected yet" message. **Your job is to replace the bodies of these functions with real calls. Do not change the interface markup.** The exact current code is in Appendix A.

Rules for the adapters:

- Resolve with the data shape documented here. Reject with `new Error('a message a normal person can read')`. The frontend shows `error.message` to the user as it is.
- Never resolve fake data. If a call is not ready, leave it rejecting with `NOT_CONNECTED`.
- Dates are ISO strings in UTC. The frontend formats them for display.

### Frontend status: what is wired and what is not

| Area | Status |
|---|---|
| Sign up, log in, log out, session restore, account page | Wired to `AUTH` |
| Create or edit worker profile | Wired to `AUTH.saveMyWorkerProfile` |
| Plan card (free month, paid until, payment needed) | Wired to `BILLING` |
| Feedback links (Blaze, rating, testimonial) | Wired to `REVIEWS` |
| Public list of professionals | **Not wired.** It currently reads six built-in sample professionals (`SEED`). Needs a `WORKERS` adapter (section 6.5) |
| Opening a professional by id | Not wired. The frontend assumes numeric ids and must be changed to text ids |
| Shareable link to one professional | Not built (planned `#pro/ID`) |
| Profile photo upload | **Not built.** The photo only shows locally on the user's device |
| Portfolio photo upload and gallery | **Not built.** The gallery shows placeholder tiles |
| Loading, empty and error states for the list | Not built |
| Forgot password and reset password | **Not built** |
| Delete my profile and delete my account | **Not built** (the Terms promise it) |
| "Report this profile" | Currently opens an email to the address in `SITE.email` |
| Privacy Policy page | Not written yet (the Terms refer to it) |
| Admin panel | Not part of the frontend. You build it (section 11) |

The frontend owner will build the "not built" items in an integration pass once the API in section 6 is agreed.

## 3. Hosting and configuration

- Serve the files over **HTTPS** from any static host (Vercel or Netlify are fine). File names are lowercase and must match exactly.
- The app uses `#` links only, so no server routing is needed: `…/#rate/TOKEN` for feedback links, and `#pro/ID` for profiles (planned).
- Home-screen install (Android and iPhone) is already set up with `manifest.webmanifest` and icon files. It needs HTTPS.
- **Keys:** only the Paystack **public** key may appear in the frontend. The secret key lives only on the server.

| Setting | Where | Value |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | server only | from Paystack dashboard |
| `PAYSTACK_PUBLIC_KEY` | frontend | from Paystack dashboard (`pk_...`) |
| `PLAN_PRICE_PESEWAS` | server | `2000` (GH₵20) |
| `TRIAL_DAYS` | server | `30` |
| `SITE_URL` | server | the live address, used when building links |
| SMS / email keys | server | for reminders (section 9) |

The frontend also has `PLAN = { price: 20, trialDays: 30 }` (display only). Keep it equal to the server values.

## 4. Data model

Use any database. Field names below are what the frontend expects in API responses. Times are UTC.

### users
| Field | Type | Notes |
|---|---|---|
| id | uuid / text | primary key |
| name | text | required |
| phone | text | WhatsApp number as typed, for example `0244123456` |
| email | text | unique, required |
| password hash | | handled by your auth provider |
| terms_accepted_at | timestamp | the sign-up form has a required checkbox. Store the time **and** the Terms version (`SITE.updated`) |
| created_at | timestamp | |

### workers (one public profile per user)
| Field | Type | Rules |
|---|---|---|
| id | text / uuid | **text ids are fine**: the frontend will be changed to match |
| user_id | fk, unique | one profile per user |
| type | text | `Personal` or `Business` |
| name | text | 2 to 80 characters (person or business name) |
| category | text | **free text, up to 40 characters.** Five core values: `Plumbing`, `Electrical`, `Carpentry`, `Painting`, `Masonry`. Workers may type any other category, such as `Graphic Design`. **Do not restrict this to a fixed list** |
| area | text | 2 to 80 characters. Convention: `City – Neighbourhood` (with an en dash). The city chips on the search page take the text before the dash |
| phone | text | WhatsApp number, 9 to 20 characters. The frontend builds `https://wa.me/` links by removing non-digits and turning a leading `0` into `233` |
| years | integer | 0 to 70 |
| bio | text | up to 600 characters. Store as plain text, never HTML |
| photo_url | text, nullable | profile photo |
| verified | boolean | **admin only**, default false |
| status | text | `active`, `hidden` (by admin), `suspended` |
| published_at | timestamp | set the first time the profile is saved. **This starts the free month** |
| created_at, updated_at | timestamp | |

Derived values (compute, do not let users write them): `rating` (average of star ratings, one decimal), `reviews` (number of **ratings**, not testimonials), `blazes` (number of Blazes), `testimonials` (see feedback).

### portfolio_items
`id`, `worker_id`, `image_url`, `storage_path`, `title` (optional), `created_at`. Maximum 12 per worker.

### feedback_invites
| Field | Notes |
|---|---|
| token | random, URL-safe, at least 128 bits, matching `[A-Za-z0-9_-]{6,80}` (the frontend only accepts links of this shape) |
| worker_id | |
| client_name | optional first name the worker typed |
| created_at, expires_at | suggest 30 days |
| used_at | null until used. **Single use** |

### feedback
| Field | Notes |
|---|---|
| id, worker_id | |
| invite_id | **unique**, so one invite gives one feedback |
| blaze | boolean (a "fire" reaction). Counts as 1 Blaze |
| rating | integer 1 to 5, or null |
| testimonial | text up to 400, or null |
| client_name | up to 30 characters, shown publicly (first name only) |
| status | `published`, `hidden`, `removed` |
| created_at | |

At least one of `blaze`, `rating`, `testimonial` must be present. The client may do one, two or all three.

### subscriptions and payments
`subscriptions`: `worker_id` (unique), `trial_ends_at`, `paid_until` (the single date the profile is visible until).
`payments`: `id`, `worker_id`, `amount_pesewas`, `currency` (`GHS`), `paystack_reference` (**unique**), `channel` (`mobile_money` or `card`), `status`, `paid_at`, `period_start`, `period_end`, `raw_event` (store the Paystack payload).

### reports
`id`, `worker_id`, `reporter_contact` (optional), `reason`, `created_at`, `status`. (The frontend currently uses email. Replace with an endpoint when ready.)

## 5. Business rules

**Free month.** When a worker saves their profile for the first time, set `published_at = now`, `trial_ends_at = now + 30 days` and `paid_until = trial_ends_at`. One free month per account. Consider also blocking repeat trials with the same phone number.

**Status the frontend shows** (compute on the server and return it):

```
if now < trial_ends_at            -> "trial"     (days left = trial_ends_at - now)
else if now < paid_until          -> "active"
else                              -> "expired"
endsAt = paid_until
```

**Paying.** One payment adds one month. `paid_until = max(now, paid_until) + 30 days`. Paying early stacks (it adds to the end date). **DECISION:** 30 days or a calendar month. 30 days is simpler.

**Visibility.** A profile appears in public search and on its public page only if `status = active` **and** the computed status is not `expired`. When expired, the profile is hidden from search and the page shows "This profile is not available right now". Data is kept. Paying makes it visible again. **DECISION:** how long data is kept after expiry, and whether there is a grace period of a few days.

**Verified badge.** Set by an admin only. A payment never gives it.

**Editing while expired** is allowed, but the profile stays hidden.

## 6. API contract

Suggested REST routes. Use whatever style you prefer as long as the adapter functions return the shapes below. All write routes need a logged-in user unless stated.

### 6.1 `AUTH` adapter

| Adapter function | Route | Returns |
|---|---|---|
| `signUp({ name, phone, email, password })` | `POST /auth/signup` | `{ id, name, phone, email }`, or `null` if the email must be confirmed first (the frontend then asks the user to check email) |
| `signIn({ email, password })` | `POST /auth/login` | `{ id, name, phone, email }` |
| `signOut()` | `POST /auth/logout` | nothing |
| `restoreSession()` | `GET /me` | the user, or `null` if not logged in. Must not throw for "not logged in" |
| `updateAccount({ name, phone })` | `PATCH /me` | the updated user |
| `getMyWorkerProfile()` | `GET /me/worker` | the worker object (6.6) or `null` |
| `saveMyWorkerProfile(profile)` | `PUT /me/worker` | the saved worker object. The frontend sends `{ type, name, category, area, phone, years, bio, photo, userId }`. Create on first save, update afterwards. The first save starts the free month |

Also needed, not yet in the frontend: password reset (`POST /auth/forgot`, `POST /auth/reset`), `DELETE /me/worker`, and `DELETE /me` (delete account and all data).

### 6.2 `BILLING` adapter

| Adapter function | Route | Returns |
|---|---|---|
| `getStatus()` | `GET /me/billing` | `{ status: "trial" \| "active" \| "expired", endsAt: "2026-12-21T00:00:00Z" }`, or `null` if the user has no worker profile yet |
| `pay()` | `POST /me/billing/checkout` and then Paystack checkout (section 7) | resolves the new `{ status, endsAt }` **only after the server has confirmed the payment** |

### 6.3 `REVIEWS` adapter (feedback links)

| Adapter function | Route | Returns |
|---|---|---|
| `createInvite({ clientName })` | `POST /me/invites` | `{ token }`. The frontend builds the link as `SITE_URL/#rate/TOKEN` |
| `lookupInvite(token)` | `GET /invites/:token` (public) | `{ worker: { name, category, area, photo } }`. If the token is unknown, used or expired, reject with a readable message such as "This link has already been used." |
| `submit({ token, blaze, rating, testimonial, name })` | `POST /invites/:token/feedback` (public) | `{ ok: true }`. Marks the invite used in the **same transaction** that saves the feedback |

Rules: `blaze` is true/false, `rating` is 0 (none) or 1 to 5, `testimonial` is trimmed text up to 400, `name` up to 30. Reject empty submissions. Reject a second use of the same token.

### 6.4 Job brief
No backend call. The "job brief" only builds a WhatsApp message in the browser. Nothing is stored.

### 6.5 `WORKERS` adapter (to be added)

The frontend will gain this adapter in the integration pass.

| Function | Route | Notes |
|---|---|---|
| `list({ q, category, area, verifiedOnly, minRating, sort, page })` | `GET /workers` | returns `{ items: [worker], total }`, 12 per page. Only visible profiles (section 5) |
| `get(id)` | `GET /workers/:id` | one worker including testimonials, or 404 |
| `uploadPhoto(file)` | `POST /me/worker/photo` | returns `{ url }` |
| `addPortfolio(file)` | `POST /me/worker/portfolio` | returns the item |
| `removePortfolio(id)` | `DELETE /me/worker/portfolio/:id` | |
| `report({ workerId, reason, contact })` | `POST /reports` | |

Search behaviour to match the current frontend:

- `q`: case-insensitive match against name, category and bio.
- `category`: exact match. `area`: case-insensitive substring match.
- `verifiedOnly`: only `verified = true`.
- `minRating`: for `4.8`, only workers with at least one rating and an average of 4.8 or more.
- `sort`: `rating` (average rating, workers with no ratings last, then more ratings first), `blazes` (most Blazes), `experience` (most years), `reviews` (most ratings).
- The city chips are built from the text before ` – ` in `area`. Provide a `GET /areas` list later if wanted.

### 6.6 Worker object (exact shape the frontend renders)

```json
{
  "id": "w_8f3a",
  "name": "Kwame Mensah",
  "type": "Personal",
  "category": "Plumbing",
  "area": "Kumasi – Ahodwo",
  "phone": "0244000001",
  "years": 12,
  "bio": "Burst pipes, leaking taps, water tank installs and bathroom fittings.",
  "photo": "https://.../kwame.jpg",
  "verified": true,
  "rating": 4.9,
  "reviews": 128,
  "blazes": 312,
  "testimonials": [
    { "name": "Abena", "rating": 5, "text": "Fixed my leaking tap in under an hour.", "date": "October 2026" }
  ]
}
```

`date` is shown as text, so send a display string such as `"October 2026"`. Only `published` feedback is included. Return the most recent testimonials first (the frontend shows what it receives, so cap at 20 and add paging later).

## 7. Payments with Paystack

Joel's choice: **manual monthly payment, no auto-renew.** Use normal one-time Paystack transactions, **not** the Plans/Subscriptions API. Mobile money (Ghana) is the main payment method, and card is also accepted. Make sure mobile money is enabled on the Paystack account.

**Flow**

1. The worker taps the pay button. The frontend (inside `BILLING.pay`) asks your server for a checkout: `POST /me/billing/checkout`.
2. The server creates a Paystack transaction (**Initialize Transaction**) with: the worker's email, `amount = 2000` (pesewas), `currency = GHS`, a unique `reference`, and metadata `{ worker_id, purpose: "month" }`. It returns the `access_code` (and reference) to the frontend.
3. The frontend opens Paystack's checkout with Paystack **Inline JS** (`https://js.paystack.co/v2/inline.js`). Check Paystack's InlineJS documentation for the exact call to open a transaction from an access code. The public key is the only key used in the browser.
4. Mobile money payments are **asynchronous**: the customer approves a prompt on their phone, so success can arrive after the popup closes. The frontend waits and polls `GET /me/billing` for a few minutes until `endsAt` changes, then resolves.
5. **The server confirms payment. Never trust the browser.** Handle the Paystack **webhook** `charge.success`:
   - Check the `x-paystack-signature` header: it must equal the **HMAC SHA-512 of the raw request body using the secret key**. Reject anything else.
   - Verify with Paystack's **Verify Transaction** API using the reference, and check `status = success`, `currency = GHS`, `amount = 2000`, and that the metadata `worker_id` exists.
   - Be **idempotent**: the reference is unique, and a repeated webhook must not add a second month.
   - Then insert the payment row and extend `paid_until` (section 5).
6. Register the webhook URL in the Paystack dashboard (test and live separately).

**Settlement and fees.** Paystack pays out to the bank or mobile money account set in Joel's dashboard, after its fees. Joel completes Paystack business verification before going live. Use test keys until the full flow passes.

**Refunds.** **DECISION:** refund policy (the Terms have a placeholder, `SITE.refunds`).

## 8. Reminders and expiry job

A daily scheduled job (cron) should:

1. Find workers whose free month or paid period ends in 5 days, 2 days, and today, and send a reminder.
2. Send a receipt after each successful payment.
3. Optionally send a "your profile is hidden, pay to show it again" message the day after expiry.

Channels: email, and SMS (Ghana providers such as Hubtel, Arkesel or mNotify). Keep messages short, for example: *"Hi Kwame, your ProConnect profile stays live until 21 Dec. Pay GH₵20 in your account to add another month."* The Terms say "we may send a reminder", so this is recommended but not a promise.

## 9. Security and validation

- **Repeat every frontend rule on the server.** The browser checks can be bypassed. Use the limits in section 4.
- **Ownership:** a user can read and change only their own profile, photos and invites.
- **Protected fields:** `verified`, `rating`, `reviews`, `blazes`, `status`, `paid_until` and `published_at` must never be writable by a normal user.
- **Output:** store text as plain text. The frontend escapes everything it displays, but keep it that way end to end.
- **Feedback links:** unguessable, single-use, expiring. Rate limit link creation (suggest 20 per worker per day) and feedback submission (per IP). A worker must not be able to review themselves. Record when and from which IP (hashed) each feedback was submitted.
- **Uploads:** accept JPEG, PNG or WebP only, maximum 2 MB, check the real file type, strip location data (EXIF), serve from a separate storage path per user. The frontend will resize photos before upload.
- **Auth:** HTTPS only, hashed passwords (use a managed auth provider if possible), password reset by email, login rate limiting.
- **CORS:** allow only the live site address.
- **Secrets:** server environment variables only. Never in the repository or the frontend.

## 10. Data protection (Ghana)

Joel's Terms say ProConnect handles personal data under the **Data Protection Act, 2012 (Act 843)**. Please:

- Record consent: the Terms checkbox time and Terms version at sign-up.
- Support access, correction and **deletion** of a user's data (`DELETE /me`), including their photos and feedback they wrote.
- Keep a short retention rule and apply it. **DECISION:** retention period after expiry.
- Keep logs free of passwords, card or mobile money details. ProConnect never receives those; Paystack does.
- Joel handles registration with the Data Protection Commission and a lawyer's review of the Terms and the Privacy Policy.

## 11. Admin panel (you build this)

A simple protected page for Joel with:

- A searchable list of professionals: view, **verify / unverify**, hide, suspend, delete.
- A feedback list: hide or remove fake or abusive feedback.
- A reports queue from "Report this profile".
- Subscriptions: see status and paid-until, **grant a free month or extend** manually, and see payment history with export (CSV).
- Numbers: total professionals, active, in trial, expired, payments this month.
- An audit log of admin actions.

## 12. Acceptance tests

Run these on a test deployment with Paystack test keys.

1. Sign up with the Terms box ticked (and fail without it). Log in, refresh, still logged in. Log out.
2. Create a profile with a core category, then edit it and use a **custom** category. First save starts the free month and `GET /me/billing` returns `trial` with the right end date.
3. The profile appears in search with correct filters, sorting and city chips. A guest can open it and chat on WhatsApp.
4. Create a feedback link, open it as a guest, submit Blaze only; then another link with a rating only; another with all three. Each appears on the profile and card with correct counts and averages.
5. Reuse a used link: it is rejected with a clear message. An expired link is rejected.
6. Pay with mobile money (test): `paid_until` extends by one month once. Replay the webhook: nothing changes. A webhook with a bad signature is rejected.
7. Let a profile expire (adjust the date): it disappears from search and its page says unavailable. Pay: it returns.
8. A user cannot edit another user's profile, change `verified`, or see another user's invites.
9. Upload a profile photo and portfolio photos; a wrong file type or a file over 2 MB is rejected.
10. Delete the profile and the account: the data is gone from search and the database.
11. Open the site on Android and iPhone and add it to the home screen: the icon shows.

## 13. Open decisions for Joel

| # | Decision | Suggested default |
|---|---|---|
| 1 | Month length | 30 days |
| 2 | Grace period after expiry | none, or 3 days |
| 3 | Refund policy | write it in the Terms (`SITE.refunds`) |
| 4 | What the Verified badge means | e.g. Ghana Card checked (`SITE.verifiedMeans`) |
| 5 | Data retention after expiry | e.g. 90 days |
| 6 | Reminder channels | email plus SMS |
| 7 | Contact email and report address | `SITE.contact`, `SITE.email` |
| 8 | Whether a worker can see who left feedback | no (first name only is public) |

---

## Appendix A: the connection code in `app.js` today

`NOT_CONNECTED` rejects with a message the interface turns into "not connected yet". Replace the bodies of the functions below.

```js
const NOT_CONNECTED = () => Promise.reject(new Error('NOT_CONNECTED'));
const AUTH = {
  signUp: (/* { name, phone, email, password } */) => NOT_CONNECTED(),   // resolve { id, name, phone, email } (or null if email confirmation is needed)
  signIn: (/* { email, password } */) => NOT_CONNECTED(),                // resolve { id, name, phone, email }
  signOut: () => NOT_CONNECTED(),
  restoreSession: () => Promise.resolve(null),                           // resolve the logged-in user, or null
  updateAccount: (/* { name, phone } */) => NOT_CONNECTED(),             // resolve the updated user
  getMyWorkerProfile: () => Promise.resolve(null),                       // resolve this user's worker profile, or null
  saveMyWorkerProfile: (/* profile incl. userId */) => NOT_CONNECTED(),  // create or update, resolve the saved profile
};
```

```js
const BILLING = {
  getStatus: () => Promise.resolve(null),   // resolve { status: 'trial' | 'active' | 'expired', endsAt: '2026-12-21' } for the logged-in professional
  pay: () => NOT_CONNECTED(),               // open the checkout for ONE month (GH₵20, mobile money or card). When the server has confirmed the payment, resolve the new { status, endsAt }
};
const REVIEWS = {
  createInvite: (/* { clientName } */) => NOT_CONNECTED(),   // make a single-use token on the server, resolve { token }
  lookupInvite: (/* token */) => NOT_CONNECTED(),            // resolve { worker: { name, category, area, photo } }
  submit: (/* { token, blaze, rating, testimonial, name } */) => NOT_CONNECTED(),
};
```

## Appendix B: two flows

**Feedback link**
1. Worker (logged in) taps "Create feedback link" -> `REVIEWS.createInvite` -> server stores an invite, returns `token`.
2. The page shows `SITE_URL/#rate/TOKEN`, with Copy and a WhatsApp share button.
3. Client opens the link -> the page calls `REVIEWS.lookupInvite(token)` -> shows the worker's name and photo.
4. Client picks Blaze and/or stars and/or writes a testimonial -> `REVIEWS.submit(...)` -> server saves feedback and marks the invite used, in one transaction.
5. The profile now shows the new counts and testimonial.

**Monthly payment**
1. Worker taps "Add a month" -> `BILLING.pay()` -> server initializes a Paystack transaction (GH₵20) -> Paystack checkout opens.
2. Worker pays (mobile money prompt on the phone, or card).
3. Paystack calls the webhook -> server verifies signature and transaction -> adds one month to `paid_until`.
4. The frontend sees the new `endsAt` from `GET /me/billing` -> the plan card shows "Paid until ...".

## Appendix C: sample data in the frontend that must be removed

`SEED` in `app.js` holds six demo professionals with made-up ratings, Blazes and testimonials, and the landing page shows sample numbers ("1,200+ verified pros", "4.8 average rating", "under 5 minutes to first reply"). All of this is placeholder and must be replaced by real data or removed before launch.
