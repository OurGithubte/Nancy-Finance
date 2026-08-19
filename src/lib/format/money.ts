/**
 * Standard Currency & Number Formatter for Nancy Finance
 * Currency: VND (Vietnamese Dong)
 * Rules:
 * 1. Base storage unit is integer Dong (no decimals in VND amounts).
 * 2. Standard format: "12.550.000 ₫" (dots as thousand separators)
 * 3. Compact format: "23.75M", "532.45M", "1.2B"
 */

export interface FormatMoneyOptions {
  showSign?: boolean;
  hideCurrency?: boolean;
  useShortSuffix?: boolean;
}

export function formatVND(
  amount: number | bigint | string | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return options.hideCurrency ? "0" : "0 ₫";
  }

  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  const isNegative = num < 0;
  const absValue = Math.abs(num);

  // Format with dots as thousand separator: 12.550.000
  const formattedAbs = absValue
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (options.showSign && num > 0) {
    sign = "+";
  }

  const currencySuffix = options.hideCurrency ? "" : " ₫";
  return `${sign}${formattedAbs}${currencySuffix}`;
}

export function formatCompactVND(
  amount: number | bigint | null | undefined
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0";
  }

  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace(/\.00$/, "");
    return `${sign}${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.00$/, "");
    return `${sign}${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${val}K`;
  }

  return `${sign}${abs.toString()}`;
}

export function formatPercent(
  value: number | null | undefined,
  options: { showSign?: boolean; decimals?: number } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }

  const decimals = options.decimals ?? 1;
  const absVal = Math.abs(value).toFixed(decimals).replace(/\.0$/, "");
  const formattedVal = absVal.replace(".", ",");

  let sign = "";
  if (value < 0) {
    sign = "-";
  } else if (options.showSign || value > 0) {
    sign = "+";
  }

  return `${sign}${formattedVal}%`;
}
