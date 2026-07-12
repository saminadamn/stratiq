import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryValueDto } from '@stratiq/shared';
import { CATEGORICAL_PALETTE, CHART_INK, MAX_PIE_SEGMENTS, TOOLTIP_STYLE } from './chart-theme';

// Part-to-whole reads clearly only up to ~6 segments (dataviz skill
// anti-patterns) — beyond that, fold the smallest slices into "Other" rather
// than adding a 7th/8th hue nobody can distinguish.
function foldIntoOther(data: CategoryValueDto[]): CategoryValueDto[] {
  if (data.length <= MAX_PIE_SEGMENTS) {
    return data;
  }
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const kept = sorted.slice(0, MAX_PIE_SEGMENTS - 1);
  const rest = sorted.slice(MAX_PIE_SEGMENTS - 1);
  const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [...kept, { label: 'Other', value: otherValue }];
}

export function PieBreakdownChart({ data }: { data: CategoryValueDto[] }): JSX.Element {
  const segments = foldIntoOther(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <Pie
          data={segments}
          dataKey="value"
          nameKey="label"
          innerRadius={56}
          outerRadius={80}
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {segments.map((entry, index) => (
            <Cell key={entry.label} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] ?? '#0d9488'} />
          ))}
        </Pie>
        {/* Text carries identity alongside the fill (dataviz skill: "never
            color alone") — legend labels stay in ink, never the slice color. */}
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: CHART_INK.secondary, lineHeight: '20px' }}
        />
        <Tooltip {...TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
