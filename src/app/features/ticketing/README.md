# Ticketing feature

Self-contained attendee registration, ticketing, QR tickets and a check-in
flow for **A Night of Angels**.

> **Frontend-only for now.** Data is served by a **mock API** (`AttendeeApiService`)
> that seeds sample attendees and persists to `localStorage`. There is **no real
> backend yet**, and admin auth is a **client-side passcode placeholder** — not
> real security. See "Going live" below.

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

## Test the full flow (local)

```bash
npm start          # ng serve
```

1. Go to `/admin/login`, enter `angels2026`.
2. `/admin/register` — add an attendee → note the generated code / open the ticket.
3. `/admin/attendees` — confirm they appear; search/filter/export.
4. Open the ticket `/tickets/<CODE>` — scan the QR with a phone **on the same
   origin**, or open `/tickets/confirm/<CODE>` directly.
5. Press **Confirm check-in**. Re-opening shows the "already checked in" state
   (single check-in is enforced in the mock service, and must also be enforced
   server-side once the backend exists).

Reset sample data anytime: `AttendeeApiService.resetToSeed()` (or clear the
`noa_*` keys in localStorage).

## Going live (replace the mock)

Swap the bodies of `AttendeeApiService` for `HttpClient` calls to a real backend
(Node/Express + Prisma, Netlify Functions, etc.). The method signatures and the
`attendees` signal are already API-shaped:

```
POST   /api/attendees                    register()
GET    /api/attendees                    list()
GET    /api/attendees/:ticketCode        getByCode()
POST   /api/attendees/:ticketCode/check-in  checkIn()   // 409 if already in
```

Also replace `AdminAuthService` with server-enforced auth, and enforce
single check-in + unique email on the server.
