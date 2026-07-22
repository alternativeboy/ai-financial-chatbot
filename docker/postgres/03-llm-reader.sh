#!/bin/bash
# Layer 3 of the SQL guardrail (handoff §5.1) — the layer that actually holds.
#
# SqlValidatorService in the backend is a detective control: it inspects a string
# and can be out-thought. This role is enforced by Postgres itself. A query that
# slips past the validator still cannot write anything or read the conversation
# tables, because llm_reader has no privilege to do either. Both layers are
# required, but only this one is a guarantee.
#
# This is a shell script rather than a .sql file because the password comes from
# the environment, and files in docker-entrypoint-initdb.d cannot read env vars.

set -euo pipefail

: "${LLM_READER_USER:?LLM_READER_USER is required}"
: "${LLM_READER_PASSWORD:?LLM_READER_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v llm_user="$LLM_READER_USER" \
     -v llm_password="$LLM_READER_PASSWORD" \
     -v db_name="$POSTGRES_DB" <<'EOSQL'
-- Create the role only if it is missing.
--
-- Built as a string + \gexec rather than the more obvious DO $$ ... $$ block:
-- psql does not interpolate :'variables' inside dollar-quoted strings, so the
-- password would arrive at the server as the literal text ":'llm_password'".
-- format() with %I/%L also escapes the identifier and the password correctly,
-- which hand-concatenation would not.
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'llm_user', :'llm_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'llm_user')
\gexec

GRANT CONNECT ON DATABASE :"db_name" TO :"llm_user";
GRANT USAGE   ON SCHEMA public       TO :"llm_user";
GRANT SELECT  ON financial_data      TO :"llm_user";

-- Defense in depth. Recent Postgres already withholds both of these by default;
-- stating them explicitly means the guarantee does not depend on that default.
-- The second line matters most: conversations and messages are created later by
-- TypeORM migrations, and must be unreadable to this role the moment they exist.
REVOKE CREATE ON SCHEMA public FROM :"llm_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM :"llm_user";
EOSQL

echo "[03-llm-reader] role '$LLM_READER_USER' ready: SELECT on financial_data only"
