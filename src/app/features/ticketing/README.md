# Ticketing feature

Self-contained attendee registration, ticketing, QR tickets and a check-in
flow for **A Night of Angels**.

> **Backend:** data is stored server-side in **Netlify Blobs** via a Netlify
> Function (`netlify/functions/attendees.mts`), so attendees and check-ins are
> **shared across every device**. `AttendeeApiService` is a thin `fetch` client
> for that API. Admin auth is still a **client-side passcode placeholder** — not
> real security (see "Going live"). The API endpoints are currently **open** and
> the list endpoint exposes attendee contact details — add auth before wider use.

## Routes

Public (no admin chrome):

| Route | Purpose |
|-------|---------|
| `/tickets/:ticketCode` | Attendee's ticket + QR code, with Download / Print |
| `/tickets/confirm/:ticketCode` | Scanner lands here after scanning the QR → check-in |

Admin back office (`/admin`, passcode-gated, own sidebar/topbar shell):

| Route | Purpose |
|-------|---------|
| `/admin/login` | Passcode gate (demo passcode: `angels2026`) |
| `/admin` | Dashboard — revenue, tickets sold, guests, check-ins |
| `/admin/attendees` | Searchable/filterable list, check-in toggle, CSV export |
| `/admin/register` | Register an attendee, generates the ticket code |
| `/admin/tickets` | Sales & check-in breakdown by ticket type |

## Data model

`src/app/features/ticketing/models/attendee.model.ts`

```ts
Attendee { id, name, email (unique), phone, ticketType: SINGLES|COUPLES|TABLE,
           ticketCode (8-char), checkedIn, checkedInAt, createdAt }
```

## QR codes

- Library: [`qrcode`](https://www.npmjs.com/package/qrcode) (dynamically imported
  in the browser, so prerender/SSR stays clean).
- The QR encodes **only a URL** — `{APP_BASE_URL}/tickets/confirm/{ticketCode}` —
  never personal data.
- `APP_BASE_URL` comes from `src/environments/environment*.ts` (`appBaseUrl`);
  empty in dev → falls back to `window.location.origin`.

## Data storage

- Server: **Netlify Blobs** store `ticketing`, key `attendees` (a JSON array),
  read/written by `netlify/functions/attendees.mts`.
- Starts **empty** in production — the organizer registers real attendees.
- To wipe all data: delete the `attendees` blob (Netlify UI → Blobs) or add a
  small admin action; there is no destructive "reset all" in the UI by design.

## Test the full flow (local)

Run with the Netlify CLI so the `/api` function + Blobs are served (plain
`ng serve` has **no** `/api`, so the app can't load data):

```bash
npm i -g netlify-cli   # once
netlify dev            # serves the app + functions + local Blobs
```

1. Go to `/admin/login`, enter `angels2026`.
2. `/admin/register` — add an attendee → note the generated code / open the ticket.
3. `/admin/attendees` — confirm they appear; search/filter/export.
4. Open the ticket `/tickets/<CODE>` — scan the QR with a phone **on the same
   origin**, or open `/tickets/confirm/<CODE>` directly.
5. Press **Confirm check-in**. Re-opening shows the "already checked in" state
   (single check-in is enforced in the mock service, and must also be enforced
   server-side once the backend exists).

## API endpoints (Netlify Function)

```
GET    /api/attendees                       list
POST   /api/attendees                       register (409 duplicate email)
GET    /api/attendees/:ticketCode           get one (404)
POST   /api/attendees/:ticketCode/check-in  check in (404 / 409 already-in)
PATCH  /api/attendees/:ticketCode           { checkedIn } organizer override
DELETE /api/attendees/:ticketCode           remove
```

## Hardening for production (recommended next steps)

- **Auth:** replace the client-side passcode (`AdminAuthService`) with real
  auth (Netlify Identity, or a signed token), and require it on the write +
  list endpoints so attendee PII isn't publicly readable.
- Consider per-code Blob keys + conditional writes if you expect heavy
  concurrent check-ins (the current function does read-modify-write on one
  JSON document, which is fine for a single event).
