export function formatCompactNumber(value: number, currency = false): string {
  const absolute = Math.abs(value);
  const unit = absolute >= 100_000_000 ? "亿" : absolute >= 10_000 ? "万" : "";
  const divisor = unit === "亿" ? 100_000_000 : unit === "万" ? 10_000 : 1;
  const number = divisor === 1 ? new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(absolute) : (absolute / divisor).toFixed(2);
  return `${value < 0 ? "-" : ""}${currency ? "¥" : ""}${number}${unit}`;
}
