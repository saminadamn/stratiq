import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeSeriesPointDto } from '@stratiq/shared';
import { CHART_ACCENT, CHART_GRID, CHART_INK, TOOLTIP_STYLE } from './chart-theme';

export function LineTrendChart({ data }: { data: TimeSeriesPointDto[] }): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
