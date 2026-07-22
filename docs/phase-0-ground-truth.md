# Phase 0 — Ground truth verification

Verified `data/financial_data.sql` against handoff §4.1 on 2026-07-22.
Method: parsed the `COPY ... FROM stdin` block directly (no database required).

## Result: every assertion in §4.1 holds

| Claim (§4.1) | Expected | Found | |
|---|---|---|---|
| Rows | 192 | 192 | ✅ |
| Distinct companies | 49 | 49 | ✅ |
| Columns | 8 | 8 | ✅ |
| Sectors | 5 | 5 | ✅ |
| Fiscal years | 2022–2025 | 2022, 2023, 2024, 2025 | ✅ |

Column order in the dump matches the schema exactly:
`company, ticker, sector, year, revenue, net_income, operating_income, gross_profit`.

## Partial coverage (49 × 4 − 4 = 192)

The two companies with fewer than 4 years are exactly the ones named in §4.1:

- **BlackRock** — 2022, 2023 only
- **Shopify** — 2024, 2025 only

Every other company has all four years. No duplicate `(company, year)` pairs.

## Sector distribution

| Sector | Companies |
|---|---|
| Technology | 15 |
| Finance | 15 |
| Consumer | 9 |
| Healthcare | 8 |
| Energy | 2 |

Total 49. Each company maps to exactly one ticker (49 distinct tickers).

## NULL values

`\N` counts by column, confirming the §4.1 examples:

| Column | NULL rows | Notable |
|---|---|---|
| gross_profit | 134 | includes **Amazon** ✅ |
| operating_income | 76 | |
| revenue | 13 | includes **Goldman**, **WellsFargo** ✅ |
| net_income | 4 | Mastercard |

`gross_profit` is NULL for the majority of rows — the system prompt's "handle NULLs
explicitly" rule (§6.2 rule 4) carries real weight, not just edge-case weight.

## Units

All monetary values are full USD integers, not millions. Spot check against the S1
acceptance criterion:

```
Apple  AAPL  Technology  2023  383285000000  96995000000  114301000000  169148000000
```

Apple's 2023 net income is **96,995,000,000** — matches the `$96,995,000,000` that
scenario S1 requires the model to reproduce exactly.

Every numeric field parses as an integer or `\N`; no floats, no thousands separators,
no currency symbols. `BIGINT` is the correct column type (Amazon's 2024 revenue,
637,959,000,000, overflows `INTEGER`).

## Note on the dump

`data/financial_data.sql` opens with `DROP TABLE IF EXISTS financial_data;` and creates
the table itself, but contains **no index definitions**. The three indexes from §4.1 must
live in `docker/postgres/02-indexes.sql`, which runs after this file — as §9's folder
layout already specifies.
