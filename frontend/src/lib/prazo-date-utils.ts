export function normalizeDateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function parseExtraHolidayInput(value: string): { dates: string[]; invalid: string[] } {
  const parts = value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const dates: string[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    const normalized = normalizeDateInputToIso(part);
    if (!normalized) {
      invalid.push(part);
      continue;
    }
    if (!dates.includes(normalized)) {
      dates.push(normalized);
    }
  }

  return { dates, invalid };
}

export function parseSuspensionPeriodsInput(
  value: string,
): { periods: { dataInicio: string; dataFim: string }[]; invalid: string[] } {
  const parts = value
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const periods: { dataInicio: string; dataFim: string }[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    const match = part.match(/^(.+?)\s+(?:a|ate)\s+(.+)$/i) ?? part.match(/^(.+?)\s*-\s*(.+)$/);
    if (!match) {
      invalid.push(part);
      continue;
    }

    const dataInicio = normalizeDateInputToIso(match[1]);
    const dataFim = normalizeDateInputToIso(match[2]);
    if (!dataInicio || !dataFim || dataInicio > dataFim) {
      invalid.push(part);
      continue;
    }

    if (!periods.some((item) => item.dataInicio === dataInicio && item.dataFim === dataFim)) {
      periods.push({ dataInicio, dataFim });
    }
  }

  return { periods, invalid };
}
