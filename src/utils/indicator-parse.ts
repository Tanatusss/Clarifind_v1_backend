
export function parseIndicators(value?: string | null): string[] {
  if (!value) return [];
  const t = value.trim();
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (parsed && Array.isArray((parsed as any).codes)) return (parsed as any).codes.map(String);
    } catch {}
  }
  return t.split(/[,\uFF0C;|]/).map(s => s.trim()).filter(Boolean);
}
export function pickLatestDate(...dates: (Date | null | undefined)[]) {
  return dates.filter(Boolean).sort((a, b) => +b! - +a!)[0] ?? null;
}
