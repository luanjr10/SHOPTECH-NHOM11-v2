export function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = stripDiacritics(query);
  if (!q) return true;
  return stripDiacritics(text).includes(q);
}
