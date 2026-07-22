import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResultRow } from '../../types/chat.types';

const SERIES_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed'];
const MAX_SERIES = 4;
const MAX_BARS = 30;

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
const full = new Intl.NumberFormat('en-US');

interface ChartShape {
  labelKey: string;
  valueKeys: string[];
}

/**
 * Decides whether a result set is worth drawing.
 *
 * BIGINT columns arrive as strings from node-postgres, so "is this a number?"
 * cannot be answered by typeof alone — a label column is a string that does
 * *not* parse as a number, which is what keeps a ticker like "AAPL" as a label
 * and revenue as a value.
 */
export function findChartShape(rows: ResultRow[]): ChartShape | null {
  if (rows.length < 2 || rows.length > MAX_BARS) return null;

  const keys = Object.keys(rows[0] ?? {});
  if (keys.length < 2) return null;

  const labelKey = keys.find((key) =>
    rows.every(
      (row) => typeof row[key] === 'string' && Number.isNaN(Number(row[key])),
    ),
  );
  if (!labelKey) return null;

  const valueKeys = keys.filter(
    (key) =>
      key !== labelKey &&
      rows.some((row) => row[key] !== null) &&
      rows.every((row) => row[key] === null || !Number.isNaN(Number(row[key]))),
  );
  if (valueKeys.length === 0) return null;

  return { labelKey, valueKeys: valueKeys.slice(0, MAX_SERIES) };
}

export function ResultChart({
  rows,
  shape,
}: {
  rows: ResultRow[];
  shape: ChartShape;
}) {
  const data = rows.map((row) => {
    const point: Record<string, string | number | null> = {
      label: String(row[shape.labelKey]),
    };
    for (const key of shape.valueKeys) {
      point[key] = row[key] === null ? null : Number(row[key]);
    }
    return point;
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={data.length > 6 ? -35 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            height={data.length > 6 ? 60 : 30}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => compact.format(value)}
            width={56}
          />
          <Tooltip
            formatter={(value: number | string) => full.format(Number(value))}
            contentStyle={{ fontSize: 12 }}
          />
          {shape.valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {shape.valueKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
