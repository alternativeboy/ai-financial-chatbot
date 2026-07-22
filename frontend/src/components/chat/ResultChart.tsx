import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MAX_BARS = 30;
const MIN_BARS = 2;

export interface ChartSeries {
  labelHeader: string;
  valueHeader: string;
  points: { label: string; value: number }[];
}

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Column headers that hold a number but never a quantity worth plotting. */
const ORDINAL_HEADER = /^(rank|#|no\.?|index|year|fy|fiscal\s*year|period)$/i;

const SCALES: [RegExp, number][] = [
  [/\b(t|trillion)\b/i, 1e12],
  [/\b(b|bn|billion)\b/i, 1e9],
  [/\b(m|mm|million)\b/i, 1e6],
  [/\b(k|thousand)\b/i, 1e3],
];

/**
 * Reads a number out of a markdown table cell.
 *
 * The model writes figures for humans — "$642.64 billion", "-$0.02B (~$-22M)",
 * "N/A" — so the magnitude suffix has to be applied or a billions column and a
 * millions column would plot on the same scale and lie.
 */
export function parseCell(raw: string): number | null {
  const text = raw.trim();
  if (!text || /^(n\/?a|null|—|-|–)$/i.test(text)) return null;

  const match = text.match(/-?\d[\d,]*\.?\d*/);
  if (!match) return null;

  let value = Number(match[0].replace(/,/g, ''));
  if (Number.isNaN(value)) return null;

  // A leading minus can sit outside the matched digits, e.g. "-$0.02B".
  if (/-\s*\$?\s*\d/.test(text) && value > 0) value = -value;

  const after = text.slice(match.index! + match[0].length);
  for (const [pattern, factor] of SCALES) {
    if (pattern.test(after)) {
      value *= factor;
      break;
    }
  }
  return value;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Pulls a chartable series out of the first markdown table in the answer.
 *
 * The chart is derived from what the model wrote rather than from the raw SQL
 * rows, which is what lets it survive a reload — the table is part of the
 * persisted message, the rows are not.
 */
export function parseFirstTable(markdown: string): ChartSeries | null {
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length - 2; i += 1) {
    if (!lines[i].includes('|')) continue;
    // A GFM table needs a delimiter row of dashes directly under the header.
    if (!/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) continue;

    const headers = splitRow(lines[i]);
    if (headers.length < 2) continue;

    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length && lines[j].includes('|'); j += 1) {
      const cells = splitRow(lines[j]);
      if (cells.length === headers.length) rows.push(cells);
    }
    if (rows.length < MIN_BARS || rows.length > MAX_BARS) continue;

    const parsed = headers.map((_, col) => rows.map((row) => parseCell(row[col])));
    const numericRatio = parsed.map(
      (column) => column.filter((v) => v !== null).length / column.length,
    );

    // The value column: the first mostly-numeric column that is not an ordinal.
    // Without the ordinal guard, a "Rank" or "Year" column wins and the chart
    // plots 1,2,3,4,5.
    const valueCol = headers.findIndex(
      (header, col) => numericRatio[col] >= 0.6 && !ORDINAL_HEADER.test(header),
    );
    if (valueCol === -1) continue;

    // The label column: the first that is textual, or an ordinal like Year —
    // which reads well along an axis even though it parses as a number.
    const labelCol = headers.findIndex(
      (header, col) =>
        col !== valueCol && (numericRatio[col] < 0.6 || ORDINAL_HEADER.test(header)),
    );
    if (labelCol === -1) continue;

    const points = rows
      .map((row) => ({ label: row[labelCol], value: parsed[valueCol][rows.indexOf(row)] }))
      .filter((p): p is { label: string; value: number } => p.value !== null);

    if (points.length < MIN_BARS) continue;

    return {
      labelHeader: headers[labelCol],
      valueHeader: headers[valueCol],
      points,
    };
  }

  return null;
}

/**
 * Single-series bar chart.
 *
 * Deliberately has no legend: with one series the heading already says what is
 * plotted, so a legend is noise. There is exactly one y-axis — a second scale
 * is the classic way to make two unrelated quantities look comparable.
 *
 * Colours come from CSS custom properties rather than literals so the theme
 * stays in one place, and so no .tsx carries a raw colour value.
 */
export function ResultChart({ series }: { series: ChartSeries }) {
  const gradientId = 'bar-emerald';

  return (
    <figure className="mt-3">
      <figcaption className="mb-2 font-mono text-[12px] font-semibold text-muted-foreground">
        {series.valueHeader} by {series.labelHeader}
      </figcaption>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series.points}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
            barCategoryGap="18%"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-bar-from)" />
                <stop offset="100%" stopColor="var(--chart-bar-to)" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-axis)" />
            <XAxis
              dataKey="label"
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--chart-ink)', fontSize: 11 }}
              tickLine={false}
              interval={0}
              angle={series.points.length > 6 ? -35 : 0}
              textAnchor={series.points.length > 6 ? 'end' : 'middle'}
              height={series.points.length > 6 ? 56 : 28}
            />
            <YAxis
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--chart-ink)', fontSize: 11 }}
              tickLine={false}
              width={54}
              tickFormatter={(value: number) => compact.format(value)}
            />
            <Tooltip
              cursor={{ fill: 'var(--chart-cursor)' }}
              formatter={(value: number | string) => [
                full.format(Number(value)),
                series.valueHeader,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: '1px solid var(--chart-axis)',
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {series.points.map((point) => (
                <Cell key={point.label} fill={`url(#${gradientId})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
