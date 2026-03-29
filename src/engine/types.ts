export type CellKey = `${number},${number}`;

export interface Pattern {
  name: string;
  description?: string;
  author?: string;
  category?: string;
  cells: [number, number][];
  createdAt: string;
  updatedAt: string;
}

export interface PatternMeta {
  name: string;
  filename: string;
  category?: string;
}

export interface PatternListResponse {
  samples: PatternMeta[];
  user: PatternMeta[];
}

export function toKey(col: number, row: number): CellKey {
  return `${col},${row}`;
}

export function parseKey(key: CellKey): [number, number] {
  const idx = key.indexOf(",");
  return [Number(key.slice(0, idx)), Number(key.slice(idx + 1))];
}
