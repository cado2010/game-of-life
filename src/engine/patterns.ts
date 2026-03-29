import type { Pattern } from "./types";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function serializePattern(
  name: string,
  cells: [number, number][],
  description?: string,
  author?: string,
  category?: string
): Omit<Pattern, "createdAt" | "updatedAt"> {
  return {
    name,
    cells,
    ...(description && { description }),
    ...(author && { author }),
    ...(category && { category }),
  };
}
