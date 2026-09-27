export function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
