import { type CellKey, toKey, parseKey } from "./types";

export class GameEngine {
  private liveCells: Set<CellKey> = new Set();
  private _generation = 0;

  get generation(): number {
    return this._generation;
  }

  get population(): number {
    return this.liveCells.size;
  }

  step(): void {
    const neighborCounts = new Map<CellKey, number>();

    for (const key of this.liveCells) {
      const [col, row] = parseKey(key);
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const nk = toKey(col + dc, row + dr);
          neighborCounts.set(nk, (neighborCounts.get(nk) ?? 0) + 1);
        }
      }
    }

    const next = new Set<CellKey>();
    for (const [key, count] of neighborCounts) {
      if (count === 3 || (count === 2 && this.liveCells.has(key))) {
        next.add(key);
      }
    }

    this.liveCells = next;
    this._generation++;
  }

  stepN(n: number): void {
    for (let i = 0; i < n; i++) {
      this.step();
    }
  }

  toggleCell(col: number, row: number): void {
    const key = toKey(col, row);
    if (this.liveCells.has(key)) {
      this.liveCells.delete(key);
    } else {
      this.liveCells.add(key);
    }
  }

  setCell(col: number, row: number, alive: boolean): void {
    const key = toKey(col, row);
    if (alive) {
      this.liveCells.add(key);
    } else {
      this.liveCells.delete(key);
    }
  }

  isAlive(col: number, row: number): boolean {
    return this.liveCells.has(toKey(col, row));
  }

  clear(): void {
    this.liveCells.clear();
    this._generation = 0;
  }

  getLiveCells(): [number, number][] {
    const cells: [number, number][] = [];
    for (const key of this.liveCells) {
      cells.push(parseKey(key));
    }
    return cells;
  }

  getCellSet(): Set<CellKey> {
    return this.liveCells;
  }

  loadPattern(cells: [number, number][]): void {
    this.liveCells.clear();
    this._generation = 0;
    for (const [col, row] of cells) {
      this.liveCells.add(toKey(col, row));
    }
  }
}
