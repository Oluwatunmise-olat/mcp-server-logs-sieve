const UNITS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseRelativeTime(input: string): string {
  const match = input.match(/^(\d+)([mhd])$/);
  if (match) {
    const [, amount, unit] = match;
    return new Date(Date.now() - Number(amount) * UNITS[unit]).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input;

  throw new Error(
    `Invalid time format "${input}". Use ISO 8601 (e.g. 2026-03-06T00:00:00Z) or relative (e.g. 1h, 30m, 7d).`,
  );
}
