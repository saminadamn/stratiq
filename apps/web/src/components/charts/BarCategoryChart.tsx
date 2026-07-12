import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CategoryValueDto } from '@stratiq/shared';
import { CHART_ACCENT, CHART_GRID, CHART_INK, TOOLTIP_STYLE } from './chart-theme';

// One color for every bar — these are nominal categories (products, regions),
// not an ordered scale, so hue stays uniform and position/label alone carry
// identity (see dataviz skill: "never a value-ramp on nominal categories").
export function BarCategoryChart({
  data,
  color = CHART_ACCENT,
  dataKeyLabel = 'label',
}: {
  data: CategoryValueDto[];
  color?: string;
  dataKeyLabel?: string;
}): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey={dataKeyLabel}
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: CHART_GRID }} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
