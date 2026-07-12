// Shared chart chrome + color roles, applied consistently across every
// recharts component. Values are pinned to the app's existing Tailwind
// tokens (slate ink/gridlines, the teal brand accent — see
// tailwind.config.js's indigo->teal remap) rather than a separate palette,
// so charts read as part of the same product as the buttons/badges around
// them (see dataviz skill: "never mix themes within a dashboard").
export const CHART_INK = {
  primary: '#0f172a', // slate-900
  secondary: '#475569', // slate-600
  muted: '#94a3b8', // slate-400
};

export const CHART_GRID = '#f1f5f9'; // slate-100 — hairline, recessive, solid (never dashed)

// Single-series magnitude charts (one line, one set of bars) use the brand
// accent directly — a categorical palette exists for identity across
// multiple series/categories, not for "series of one" (see color-formula.md
// § categorical vs sequential).
export const CHART_ACCENT = '#0d9488'; // teal-600, matches primary buttons

// Fixed-order categorical palette for genuine multi-category identity charts
// (e.g. revenue by region). Rooted in the brand teal as slot 1, then ordered
// to maximize adjacent CVD separation — validated with
// dataviz/scripts/validate_palette.js (all 6 checks pass; contrast WARN on
// slots 2 and 4 is mitigated by always pairing this palette with a text
// legend, never color alone). Never reorder per-request — the fixed order is
// the CVD-safety mechanism, and swapping it on filter/re-sort would repaint
// categories readers already learned a color for.
export const CATEGORICAL_PALETTE = [
  '#0d9488', // teal
  '#eda100', // yellow
  '#4a3aa7', // violet
  '#e87ba4', // magenta
  '#008300', // green
  '#e34948', // red
  '#eb6834', // orange
  '#2a78d6', // blue
];

// Pie/donut charts stop reading as part-to-whole past ~6 segments (dataviz
// skill anti-patterns: "more than ~7 color classes carrying meaning").
export const MAX_PIE_SEGMENTS = 6;

export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.03)',
    fontSize: 12,
    color: CHART_INK.primary,
  },
  labelStyle: { color: CHART_INK.secondary, fontWeight: 600 },
} as const;
