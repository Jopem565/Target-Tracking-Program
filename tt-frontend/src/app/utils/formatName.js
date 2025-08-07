/**
 * Global Function to convert an ID in "FirstLastYear" format to a string
 * in "First Last" format.
 * @param {} name the ID to convert to full name string.
 * @returns String of the ID in "First Last" format.
 */

export function parseEmployeeId(id) {
  // assumes final 4 chars are year digits
  const yearStr = id.slice(-4);
  const base = id.slice(0, -4);
  const yearNum = Number(yearStr);
  return { base, yearStr, yearNum };
}

export function isValidEmployeeId(id, currentYear) {
  if (typeof id !== "string" || !id) return false;
  if (id.toLowerCase() === "names") return false;
  if (id.length < 5) return false; // need at least 1 char + 4‑digit year
  const { yearNum } = parseEmployeeId(id);
  return yearNum === currentYear;
}

export function baseToDisplayName(base) {
  let res = "";
  let capitals = 0;
  for (let i = 0; i < base.length; i++) {
    const ch = base.charAt(i);
    if (ch === ch.toUpperCase()) {
      capitals++;
      if (capitals === 2) res += " ";
    }
    res += ch;
  }
  return res;
}

export function idToDisplayName(id) {
  const { base } = parseEmployeeId(id);
  return baseToDisplayName(base);
}
