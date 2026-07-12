// Derives a display label from a camelCase metric key (e.g.
// "inventoryTurnover" -> "Inventory Turnover") instead of maintaining a
// second list of metric names that can drift out of sync with the backend's
// canonical registry (see default-metric-definitions.ts).
export function metricLabel(key: string | null): string {
  if (!key) {
    return 'Unknown metric';
  }
  const spaced = key.replace(/([A-Z])/g, ' $1');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
