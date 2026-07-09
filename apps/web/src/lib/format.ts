export function formatCurrency(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return new Intl.NumberFormat('en-US').format(value);
}
