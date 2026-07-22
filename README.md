# Financial Data Chat Assistant

Ask natural-language questions about the income statements of 49 U.S. public
companies (2022–2025). Claude answers by writing SQL, running it against
PostgreSQL, and reading the rows back — the query it ran is shown next to every
answer, so any figure can be traced to the statement that produced it.

The model has no other source of facts. If the data isn't in the table, the
answer is "I don't have that", not a guess.

---

## Requirements

- **Docker** (Postgres 16)
- **Node.js 20+**
- An **Anthropic API key** — <https://console.anthropic.com>

## Quickstart

From a fresh clone, this is the whole thing:

```bash
git clone https://github.com/alternativeboy/ai-financial-chatbot.git
cd ai-financial-chatbot

cp .env.example .env
# Edit .env and set two values:
#   LLM_READER_PASSWORD  — any strong string; it is created for you on first boot
#   ANTHROPIC_API_KEY    — sk-ant-…

docker compose up -d --wait          # Postgres + loads the 192-row dataset

cd backend
npm ci
npm run migration:run                # creates conversations / messages
npm run start:dev                    # http://localhost:3000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev                          # http://localhost:5173
```

Open <http://localhost:5173> and ask *"What was Apple's net income in 2023?"*

> `docker compose up --wait` returns only once the database reports healthy, and
> the health check is `count(*) = 192` rather than `pg_isready`. Postgres accepts
> connections partway through loading the dataset, so a readiness check would go
> green while the table was still empty.

### Check it worked

```bash
curl localhost:3000/api/health          # {"status":"ok","postgres":"up"}
docker exec financial-postgres psql -U postgres -d financial_db \
  -tAc 'SELECT count(*) FROM financial_data'    # 192
```

---

## How the SQL guardrail works

The model writes SQL. That SQL is untrusted, and two independent layers assume
it is hostile.

**Layer 2 — `SqlValidatorService`.** Six rules: SELECT/WITH only, no blocked
keyword, one statement, must reference `financial_data`, no catalog or
application tables, no comments. Each runs against a copy of the query with the
*contents* of string literals removed, so a real question about a company called
`'Drop Inc'` is not mistaken for a `DROP`.

This layer is a detective control. It reasons about a string, and a string can
be crafted to read one way to a regex and another to a parser.

**Layer 3 — the `llm_reader` role.** Model-authored SQL runs on a second
connection logged in as a Postgres role holding `SELECT` on exactly one table.
This is the guarantee. A query that talks its way past the validator still
cannot write, and still cannot read the conversation tables:

```bash
PGPASSWORD='<LLM_READER_PASSWORD>' docker exec -i financial-postgres \
  psql -U llm_reader -d financial_db -h 127.0.0.1 \
  -c "INSERT INTO financial_data VALUES ('x','X','Tech',2024,1,1,1,1)"
# ERROR: permission denied for table financial_data
```

Results are capped at 200 rows by wrapping the query — a three-way self join on
this table is 7,077,888 rows, so the limit has to be applied by the database
rather than by trimming an array afterwards.

Each query also runs in a transaction that begins with
`SET LOCAL statement_timeout = 5000`. That looks like a roundabout way to set a
timeout, and the two obvious alternatives were both measured and rejected:

| Approach | Local Docker | Hosted Postgres (Neon) |
|---|---|---|
| Client option (`statement_timeout` on the connection) | works | **ignored** |
| `ALTER ROLE llm_reader SET statement_timeout` | works | works direct, **discarded by the pooler** |
| `SET LOCAL` inside the transaction | works | works |

The first two fail *silently* — the connection still looks correctly
configured and the query simply runs uncapped. `SET LOCAL` is scoped to the
transaction, so no pooler can reset it between the setting and the statement it
protects. The role-level default is applied too, as a second line for direct
connections.

---

## Tests

```bash
cd backend
npm test          # 46 unit  — SQL validator attack cases, tool loop, cost, titles
npm run test:e2e  # 31 e2e   — session isolation, guardrails, CRUD
```

The e2e suite needs the database running. The most valuable file is
`src/llm/services/sql-validator.service.spec.ts`: stacked statements, comment
bypasses, `pg_sleep`, `information_schema`, reads via JOIN and UNION, and mixed
case — alongside the queries that must keep working.

The Layer 3 tests in `test/financial.e2e-spec.ts` deliberately bypass the
validator and run straight against the connection, so they would still fail if
Layer 2 were deleted.

---

## Deployment

Free tier throughout: **Neon** (database), **Render** (backend), **Vercel**
(frontend).

### 1. Database — Neon

Create a project at <https://neon.tech>. Neon gives you two hostnames for the
same database, and the difference matters:

| Endpoint | Host | Use for |
|---|---|---|
| **Direct** | `ep-xxx.region.aws.neon.tech` | the data load, `neon-setup.sql`, migrations |
| **Pooled** | `ep-xxx-pooler.region.aws.neon.tech` | the running app (`DATABASE_HOST` on Render) |

Migrations and DDL want a real session; PgBouncer transaction pooling is a poor
fit for them.

```bash
export NEON_DIRECT='postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require'

psql "$NEON_DIRECT" -f data/financial_data.sql
psql "$NEON_DIRECT" -v llm_password="'a-strong-password'" -f deploy/neon-setup.sql
```

`deploy/neon-setup.sql` adds the indexes and creates `llm_reader` — the work
that `docker/postgres/` does automatically for a local container, which a
managed database has no hook for. It ends by asserting `can_read` and
`cannot_write`; both must be `t`.

Then create the application tables:

```bash
cd backend
DATABASE_SSL=true DATABASE_HOST=… DATABASE_USER=… DATABASE_PASSWORD=… \
DATABASE_NAME=… DATABASE_PORT=5432 npm run migration:run
```

> **Do not use Render's free Postgres** — it expires after 90 days. Supabase's
> free tier pauses after a week of inactivity; Neon scales to zero instead,
> which only makes the first query after an idle period slow.

### 2. Backend — Render

`render.yaml` is a Blueprint: point Render at the repo and it picks up the build
and start commands and the health check path. Set the secrets in the dashboard
(they are marked `sync: false` so they are never written into the repo):
`DATABASE_*`, `LLM_READER_*`, `ANTHROPIC_API_KEY`, and `CORS_ORIGIN`.

**`DATABASE_SSL=true` is required.** Managed Postgres refuses plaintext
connections; the blueprint sets it for you.

### 3. Frontend — Vercel

Deploy `frontend/`. Set `VITE_API_URL` to the Render URL plus `/api`
(e.g. `https://financial-chat-api.onrender.com/api`).

`vercel.json` rewrites every non-API path to `index.html`. Without it a reload
on `/c/<id>` asks the host for a file that does not exist and gets a 404 —
routing works in dev only because Vite does the same rewrite for you.
`frontend/public/_redirects` is the Netlify / Cloudflare Pages equivalent.

### 4. Close the loop

Set `CORS_ORIGIN` on Render to the Vercel origin and redeploy. The allowlist
rejects anything else, and `*` is refused at boot.

> **Render free instances sleep when idle** and take 30–60 seconds to wake. The
> first message after a quiet period will look like it hung — it hasn't.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Bind for 0.0.0.0:5432 failed` | Another Postgres owns the port. Change `DATABASE_PORT` in `.env` — compose publishes `${DATABASE_PORT}:5432` and the backend dials the same value. |
| Boot fails listing several variables | Joi validates the whole environment at startup and reports every missing key at once. Compare `.env` against `.env.example`. |
| `CORS_ORIGIN must list explicit origins` | `*` is rejected deliberately. List the origins. |
| `financial_data schema mismatch` at boot | The table no longer has the expected eight columns. This is intentional: a column change invalidates the validator allowlist, the `GRANT` and the prompt at once, so it fails loudly rather than answering wrongly. |
| `401 invalid x-api-key` | Check `ANTHROPIC_API_KEY`. A stray character on paste is the usual cause. |
| `no pg_hba.conf entry … no encryption` | Managed database, TLS off. Set `DATABASE_SSL=true`. |
| Health check never goes green | The dataset failed to load. `docker compose logs postgres`. To re-run the init scripts: `docker compose down -v` (this drops the volume). |

---

## Layout

```
backend/src/
  config/      env validation (Joi), both data sources
  common/      @SessionId() decorator, base entity
  chat/        conversations + messages, SSE endpoint
  financial/   llm_reader connection, 200-row cap
  llm/         tool loop, prompt builder, SQL validator, cost
  migrations/
frontend/src/
  hooks/useStreamChat.ts    fetch + ReadableStream SSE reader
  stores/                   session id, conversation state
  components/chat/          message, SQL widget, markdown, chart
docker/postgres/            init: indexes, llm_reader role
deploy/neon-setup.sql       the same, for a managed database
data/financial_data.sql     the dataset (192 rows)
```

There is no login. A UUID in `localStorage` identifies the browser, travels as
`X-Session-Id`, and scopes every query. A conversation belonging to another
session returns **404**, never 403 — a 403 would confirm the id is real.

## Known limitations

- **Charts only render while a reply streams.** `tool_results` stores the query
  and row count, not the rows, so a reloaded conversation has nothing to plot.
  The model's markdown tables cover it.
- **History is sent as plain text.** Earlier tool calls are not replayed to the
  model; their results are already reflected in the assistant's prose.
- **Whoever holds the session UUID holds the conversations.** That is the whole
  access model, and it is why this is a demo rather than something to put real
  data in.
