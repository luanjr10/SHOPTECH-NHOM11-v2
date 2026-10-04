export function isoDateToChartLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${m}-${d}-${y}`;
}

export function monthLabelToChartLabel(monthLabel: string): string {
  const [m, y] = monthLabel.split("-");
  return `${m}-01-${y}`;
}
