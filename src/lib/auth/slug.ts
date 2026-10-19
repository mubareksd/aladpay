export function slugifyCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "company";
}

export function withUniqueSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base;
  const suffix = `-${attempt + 1}`;
  const max = 48 - suffix.length;
  return `${base.slice(0, max)}${suffix}`;
}
