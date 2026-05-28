export function toSpecraIdentifier(raw: string): string {
  const segments = raw
    .replace(/^@/u, "")
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);
  const base =
    segments
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join("") || "SpecraApp";

  return /^[A-Za-z_]/u.test(base) ? base : `Specra${base}`;
}
