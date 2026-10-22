# ReturnDesk

A returns desk for a small online store. Agents raise return/replacement requests against an order, work them through a fixed lifecycle, decide on a refund, replacement or store credit, leave notes, and close them out.

- **API health check:** `http://localhost:4000/api/health`
- **Time spent:** roughly `24` hours

## Status at a glance

| Area | State |
|---|---|
| Backend API, all 5 business rules enforced on the server | Done |
| PostgreSQL schema with constraints, migration script | Done |
| Seed script (36+ requests, all statuses and reasons, notes) | `<Done / Written but not yet run: edit this line honestly>` |
| List page: server-side search, filters, sort, paging, states | Done |
| Detail page: full record, notes timeline, legal-only actions, approve dialog | Done |
| Create-request form in the UI | Not done (requests can be created via the API) |
| Edit form in the UI | Not done (editing works via the API) |
| Deployment | `<Done / Not done: edit this line honestly>` |
| Automated tests | Not done |

## Tech stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, JavaScript
- **Backend:** Node.js + Express 5, a separate service (the brief allows this), JavaScript with ES modules
- **Database:** PostgreSQL on Supabase, accessed with `pg` and hand-written SQL
- Supabase is used only as hosted Postgres. None of its auto-generated APIs are used; every endpoint is written by hand.

## Project structure

```
returndesk/
  backend/
    db/
      schema.sql          # full schema, safe to re-run
      migrate.js          # applies schema.sql
      seed.js             # wipes and refills the tables with demo data
    src/
      server.js           # starts the HTTP server
      app.js              # middleware, routes, 404 and error handler
      db.js               # connection pool, transaction helper
      constants.js        # statuses, reasons, transition map (single source of truth)
      validation.js       # all input validation
      errors.js           # AppError class and the error-response middleware
      routes/requests.js  # thin HTTP layer
      services/requestService.js  # business rules and SQL
  frontend/
    src/
      app/                # layout, list page (/), detail page (/requests/[id])
      components/         # list, filters, table, pagination, detail, notes, approve dialog
      hooks/useDebounce.js
      lib/                # api client, constants, formatting
```

## Setup from a clean machine

**Prerequisites:** Node.js 20+, Git, a Supabase account (or any PostgreSQL database).

### 1. Clone

```bash
git clone https://github.com/712Kunal/ReturnDesk
```

### 2. Database

1. Create a Supabase project and note the database password.
2. Click **Connect** and copy the **Session pooler** connection string. I use the pooler because the direct connection is IPv6-only and fails on many hosts.
3. If the password contains special characters such as `@` or `#`, URL-encode them.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in DATABASE_URL
npm run migrate          # creates tables, indexes, constraints and triggers
npm run dev              # http://localhost:4000
```

Environment variables (`backend/.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | `true` for Supabase; `false` for a local Postgres without SSL |
| `PORT` | API port, default 4000 |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated |

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API, e.g. `http://localhost:4000/api` |

## The business rules and where they are enforced

Every rule is enforced by the server, and the most important ones are also enforced by the database as a backstop. The UI only reflects them.

| Rule | Server enforcement | Database backstop | Error returned |
|---|---|---|---|
| 1. Status flow (Open → In Review → Approved → Completed; In Review → Rejected; Rejected and Completed final) | Transition map in `constants.js`, checked in `transitionRequest` | `status` CHECK constraint | `409 INVALID_TRANSITION` (includes the allowed next states) |
| 2. Approval needs a resolution; refund amount > 0 only for Refund | `validateTransition` | `refund_rules` and `approved_needs_resolution` CHECK constraints | `422 VALIDATION_ERROR` (field-level messages) |
| 3. One live request per order + item | Unique violation translated in the service | Partial unique index `one_live_request_per_item` | `409 DUPLICATE_LIVE_REQUEST` |
| 4. Locked once Approved, Rejected or Completed | Status check in `updateRequest` | none (see decisions) | `409 REQUEST_LOCKED` |
| 5. Removal is soft, only Open or Rejected | `removeRequest` sets `deleted_at` | none | `409 NOT_REMOVABLE`; removed records return `404` |

## API

All routes are under `/api`. Success bodies use `{ "data": ... }`; lists add `{ "meta": { page, pageSize, total, totalPages } }`.

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/health` | Liveness check | 200 |
| POST | `/requests` | Create a request | 201 + `Location` header |
| GET | `/requests` | List: `q`, `status`, `reason`, `sort`, `order`, `page`, `pageSize` | 200 |
| GET | `/requests/:id` | One request with all notes and the legal actions | 200 |
| PATCH | `/requests/:id` | Edit customer, order, item, quantity, reason | 200 |
| POST | `/requests/:id/transition` | Move through the lifecycle | 200 |
| POST | `/requests/:id/notes` | Append a note | 201 |
| DELETE | `/requests/:id` | Soft delete | 204 |

`sort` accepts `createdAt`, `reference`, `customer`, `order`, `status`, `reason`. `pageSize` is limited to 1 to 100.

### Error format

Every refusal uses the same body:

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot move a request from Open to Completed",
    "details": { "from": "Open", "to": "Completed", "allowed": ["In Review"] }
  }
}
```

| Status | Used for |
|---|---|
| 400 | Malformed JSON (`INVALID_JSON`), body not an object (`INVALID_BODY`), non-numeric id (`INVALID_ID`) |
| 404 | Unknown or removed request (`NOT_FOUND`), unknown route (`ROUTE_NOT_FOUND`) |
| 409 | The request is valid but conflicts with the current state: illegal transition, duplicate live request, locked, not removable |
| 422 | Well-formed but invalid input (`VALIDATION_ERROR`, with `details.fields`) |
| 500 | Only for genuinely unexpected failures; the cause is logged on the server |

## Design decisions

**Schema**
- `reference` (for example `RD-001001`) is generated by the database from a sequence through a column default, so it is unique and no client ever supplies it.
- Rule 3 is a **partial unique index** on `(lower(order_number), lower(item_name))` for rows that are not Rejected, Completed or removed. A "check then insert" in application code can fail when two requests arrive together; the index cannot. The service catches Postgres error `23505` and returns a 409.
- Rule 2 also lives in CHECK constraints, so even a bug in the application cannot store an approved request without a resolution, or a refund amount on a non-refund.
- Rule 5 uses a nullable `deleted_at` column. Every read excludes rows where it is set, and the row stays in the table.
- `request_notes` is append-only. There are no update or delete endpoints, and a database trigger rejects `UPDATE` and `DELETE` on the table as well.
- Money is `NUMERIC(10,2)`, not a float. Types are parsed back into JavaScript numbers in `db.js`.

**Concurrency**
- Transition, edit and remove run in a transaction with `SELECT ... FOR UPDATE` on the row. Two agents acting on the same request at once cannot both succeed against stale state.

**API**
- Status changes go through a dedicated `POST /:id/transition` endpoint rather than a `PATCH` of the `status` field. Transitions carry their own rules (resolution, refund amount), and keeping them separate from detail edits keeps each endpoint's validation simple.
- `GET /requests/:id` also returns an `actions` object (legal next statuses, `canEdit`, `canRemove`). The frontend uses it to decide which buttons to show, so the rules are not duplicated in the UI.
- 409 is used for "valid request, wrong state" and 422 for "invalid data", so a client can tell the two apart.

**Code structure**
- Routes are thin. Validation is in one file (`validation.js`), and create and edit share the same field rules through a `partial` flag. Business rules and SQL are in the service layer, and constants (statuses, reasons, the transition map) are defined once.
- Sorting uses a whitelist that maps API names to column names, so no user input is ever placed into SQL as an identifier. All values are parameterised, and `%` and `_` in search text are escaped.

**Search, filter, sort, paging**
- All done in SQL (`WHERE ... ILIKE`, `ORDER BY`, `LIMIT/OFFSET`), with a separate `count(*)` for the total. Sorting has `id` as a tie-breaker so pages are stable.
- Search matches customer name, customer email, order number and reference.

**Frontend**
- Search, filters, sort and page live in the URL, so a filtered view can be shared and survives a refresh. Any filter change resets to page 1.
- Search is debounced (400 ms) so typing does not fire a request per keystroke. A stale response is ignored if a newer request has started.
- Every API call goes through one client (`lib/api.js`) that turns the server's error body into an `ApiError`. Screens show the server's own message: field errors under the field in the approve dialog, other refusals in a red banner.
- The list is a table from tablet width up and stacked cards on phones. Status is shown as a coloured badge with a dot and a text label, so colour is not the only signal.

## Assumptions

- No authentication or multiple agents; the brief does not ask for it.
- There is no orders or products table, so an "item" is identified by order number plus item name, compared case-insensitively. Quantity is not checked against an original order.
- Rule 4 says the "customer and item details" are locked from Approved onward. I therefore allow edits only in Open and In Review.
- Rejected can only be reached from In Review, following the flow in the brief.
- Refund amounts are in INR. Completing a request keeps the resolution recorded at approval.
- Adding a note to a removed request returns 404, since removed requests cannot be fetched.
- Removing a request frees its order and item for a new request, because removed rows are excluded from the uniqueness index.

