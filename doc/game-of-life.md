# Conway's Game of Life — Design Document

## 1. Project Overview

An interactive implementation of Conway's Game of Life featuring:

- An **infinite, zoomable, pannable** 2D grid rendered on an HTML5 Canvas.
- A **React + TypeScript** frontend built with Vite and styled with Tailwind CSS.
- An **Express.js** backend (co-located in the same project) for pattern file persistence via the Node.js `fs` module.
- Full **pattern management** — create, save, load, and delete patterns stored as local JSON files.
- A library of **pre-created sample patterns** shipped with the application.
- An **edit mode** for click-toggling cells to design starting configurations.
- Simulation controls: **single step, multi-step (N steps), continuous run, and stop**.
- An **Electron shell** for running the application as a native desktop app.

---

## 2. Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Runtime     | Node.js 24.x (latest current version)           |
| Language    | TypeScript (frontend and backend)               |
| Frontend    | React 18+, Vite, Tailwind CSS, HTML5 Canvas API |
| Backend     | Express.js, Node.js `fs/promises`               |
| Desktop     | Electron (native desktop shell)                 |
| Dev tooling | Concurrently, tsx (TypeScript execution)         |
| Linting     | ESLint, Prettier                                |

### Why these choices

- **HTML5 Canvas** — DOM-based grids cannot handle infinite zoom/pan efficiently. Canvas gives pixel-level control and hardware-accelerated rendering for large cell populations.
- **Tailwind CSS** — Utility-first CSS for rapid, consistent UI development without leaving component files.
- **Express.js** — Minimal, well-known HTTP server; perfect for a small file-based CRUD API.
- **Concurrently** — Runs the Vite dev server and the Express API server in a single terminal command.
- **tsx** — Runs TypeScript server code directly without a separate compile step.
- **Electron** — Wraps the web application in a native desktop window, providing file-system access and a standalone executable distribution option.

---

## 3. Project Structure

```
gol/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── postcss.config.js
├── index.html
│
├── doc/                           # Design documentation
│   └── game-of-life.md
│
├── src/                           # React frontend
│   ├── main.tsx                   # App entry point
│   ├── App.tsx                    # Root component, layout
│   ├── index.css                  # Tailwind directives + global styles
│   │
│   ├── engine/                    # Pure game logic (no React)
│   │   ├── types.ts               # Shared type definitions
│   │   ├── GameEngine.ts          # Core simulation logic
│   │   └── patterns.ts            # Pattern serialization helpers
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useGameEngine.ts       # Hook wrapping GameEngine state
│   │   ├── useCanvas.ts           # Canvas setup, render loop, zoom/pan
│   │   └── usePatterns.ts         # API calls for pattern CRUD
│   │
│   └── components/                # React UI components
│       ├── GridCanvas.tsx          # The main Canvas viewport
│       ├── Toolbar.tsx             # Edit mode, step controls, run/stop
│       ├── PatternPanel.tsx        # Pattern list, load/save/delete
│       ├── SavePatternDialog.tsx   # Modal for naming + saving a pattern
│       ├── StepInput.tsx           # Input for multi-step advance
│       └── StatusBar.tsx           # Generation count, cell count, coords
│
├── server/                        # Express backend
│   ├── index.ts                   # Server entry point
│   └── routes/
│       └── patterns.ts            # /api/patterns CRUD routes
│
├── electron/                      # Electron desktop shell
│   └── main.ts                    # Electron main process entry
│
└── patterns/                      # JSON pattern files
    ├── samples/                   # Pre-created sample patterns (shipped)
    │   ├── glider.json
    │   ├── gosper-glider-gun.json
    │   ├── pulsar.json
    │   ├── lightweight-spaceship.json
    │   ├── r-pentomino.json
    │   ├── beacon.json
    │   ├── blinker.json
    │   ├── block.json
    │   ├── toad.json
    │   └── diehard.json
    └── user/                      # User-created patterns (created at runtime)
```

---

## 4. Canvas Grid Rendering

### 4.1 Coordinate Systems

Two coordinate systems are maintained:

- **Grid coordinates** — integer (col, row) identifying a cell. Origin (0, 0) is the center of the world.
- **Screen coordinates** — pixel (x, y) on the HTML5 Canvas element.

Conversion between the two is governed by three transform parameters:

| Parameter  | Description                                 |
| ---------- | ------------------------------------------- |
| `offsetX`  | Horizontal pan offset in pixels             |
| `offsetY`  | Vertical pan offset in pixels               |
| `cellSize` | Pixel width/height of a single cell (zoom)  |

```
screenX = gridCol * cellSize + offsetX
screenY = gridRow * cellSize + offsetY

gridCol = Math.floor((screenX - offsetX) / cellSize)
gridRow = Math.floor((screenY - offsetY) / cellSize)
```

### 4.2 Rendering Pipeline

On every frame (via `requestAnimationFrame`):

1. **Clear** the canvas.
2. **Compute the visible grid range** from the viewport bounds and current transform.
3. **Draw grid lines** — thin lines at each cell boundary within the visible range. Line opacity/density adapts to zoom level: at very low zoom, only every Nth line is drawn to avoid visual noise.
4. **Draw live cells** — filled rectangles at each alive cell position that falls within the visible range.
5. **Draw cursor highlight** (edit mode only) — a semi-transparent overlay on the cell under the mouse pointer.

### 4.3 Interaction Handling

| Gesture              | Action                                           |
| -------------------- | ------------------------------------------------ |
| Mouse drag (left)    | Pan the viewport (`offsetX`, `offsetY` update)   |
| Scroll wheel         | Zoom in/out (`cellSize` scales), anchored at cursor position |
| Click (edit mode)    | Toggle the cell under the cursor alive/dead       |
| Mouse move           | Update status bar with current grid coordinates   |

### 4.4 Performance Considerations

- Only cells within the visible viewport are iterated for drawing.
- Grid lines are drawn as a set of horizontal + vertical lines spanning the viewport, not per-cell.
- `requestAnimationFrame` is used for smooth rendering; simulation ticks are decoupled from the render loop.
- Canvas is resized to fill its container via a `ResizeObserver`.

---

## 5. Game Engine (Core Logic)

### 5.1 Data Structure

Live cells are stored in a **sparse Set** using string-encoded coordinates:

```typescript
type CellKey = `${number},${number}`;

class GameEngine {
  private liveCells: Set<CellKey> = new Set();
  private generation: number = 0;
}
```

This allows an effectively infinite grid — only alive cells consume memory.

### 5.2 Simulation Step

Each generation is computed as follows:

1. Build a **neighbor count map** — for every live cell, increment the count of all 8 surrounding cells.
2. Apply the rules:
   - A cell with a count of **3** is alive in the next generation (birth or survival).
   - A cell with a count of **2** that is **currently alive** survives.
   - All other cells are dead.
3. Replace the live cell set with the new set. Increment `generation`.

```typescript
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
  this.generation++;
}
```

### 5.3 Simulation Modes

| Mode            | Behavior                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| **Single step** | Call `engine.step()` once on button press.                               |
| **Multi-step**  | User enters N; call `engine.step()` N times in a loop, then re-render.   |
| **Continuous**  | `setInterval` or `requestAnimationFrame`-driven loop calling `step()` at a configurable speed (ms per generation). |
| **Stop**        | Clear the interval / stop the loop.                                      |

Speed for continuous mode is controlled via a slider or input (e.g., 50ms–2000ms per generation).

### 5.4 Public API

```typescript
class GameEngine {
  step(): void;
  stepN(n: number): void;
  toggleCell(col: number, row: number): void;
  setCell(col: number, row: number, alive: boolean): void;
  isAlive(col: number, row: number): boolean;
  clear(): void;
  getLiveCells(): [number, number][];
  loadPattern(cells: [number, number][]): void;
  getGeneration(): number;
  getPopulation(): number;
}
```

---

## 6. Pattern / Model Management

### 6.1 JSON Schema

Each pattern is stored as a JSON file with the following structure:

```json
{
  "name": "Gosper Glider Gun",
  "description": "A pattern that emits gliders indefinitely.",
  "author": "Bill Gosper",
  "category": "gun",
  "cells": [
    [0, 4], [0, 5], [1, 4], [1, 5],
    [10, 4], [10, 5], [10, 6],
    [11, 3], [11, 7],
    [12, 2], [12, 8],
    [13, 2], [13, 8]
  ],
  "createdAt": "2026-03-28T12:00:00.000Z",
  "updatedAt": "2026-03-28T12:00:00.000Z"
}
```

| Field         | Type               | Required | Description                              |
| ------------- | ------------------ | -------- | ---------------------------------------- |
| `name`        | string             | yes      | Display name                             |
| `description` | string             | no       | Brief description of the pattern         |
| `author`      | string             | no       | Creator name                             |
| `category`    | string             | no       | e.g., "still-life", "oscillator", "spaceship", "gun", "methuselah" |
| `cells`       | [number, number][] | yes      | Array of [col, row] pairs for live cells |
| `createdAt`   | string (ISO 8601)  | yes      | Creation timestamp                       |
| `updatedAt`   | string (ISO 8601)  | yes      | Last modification timestamp              |

### 6.2 File Storage Layout

```
patterns/
├── samples/          # Read-only sample patterns shipped with the app
│   ├── glider.json
│   └── ...
└── user/             # User-created patterns (read-write)
    ├── my-pattern.json
    └── ...
```

- Sample patterns are stored in `patterns/samples/` and cannot be deleted or overwritten by the user through the API.
- User patterns are stored in `patterns/user/` and support full CRUD.

### 6.3 Workflow

1. **Save** — User designs a pattern in edit mode, clicks "Save", enters a name and optional description in a dialog, and the pattern is POSTed to the server.
2. **Load** — User browses the pattern panel (samples + user patterns), clicks one, and it is loaded onto the grid (optionally replacing or merging with existing cells).
3. **Delete** — User can delete their own patterns from the pattern panel (samples are protected).

---

## 7. UI Components & Layout

### 7.1 Overall Layout

```
┌──────────────────────────────────────────────────────┐
│  Toolbar                                             │
│  [Edit Mode] [Step] [Step N] [Run] [Stop] [Speed]    │
├────────────────────────────────┬─────────────────────┤
│                                │   Pattern Panel     │
│                                │                     │
│        Canvas Viewport         │   ┌─────────────┐   │
│        (zoomable/pannable)     │   │ Samples      │   │
│                                │   │  - Glider    │   │
│                                │   │  - Pulsar    │   │
│                                │   │  - ...       │   │
│                                │   ├─────────────┤   │
│                                │   │ My Patterns  │   │
│                                │   │  - custom1   │   │
│                                │   │  - ...       │   │
│                                │   ├─────────────┤   │
│                                │   │ [Save]       │   │
│                                │   └─────────────┘   │
├────────────────────────────────┴─────────────────────┤
│  Status Bar:  Gen: 142 | Population: 57 | (12, -8)   │
└──────────────────────────────────────────────────────┘
```

### 7.2 Component Breakdown

#### `App.tsx`
- Top-level layout (flex column: Toolbar, main area, StatusBar).
- Holds global state via `useGameEngine` and `usePatterns` hooks.
- Passes callbacks and state down to child components.

#### `GridCanvas.tsx`
- Renders the HTML5 `<canvas>` element.
- Manages pan/zoom transform state internally.
- Accepts `liveCells`, `editMode`, and `onCellToggle` as props.
- Uses `useCanvas` hook for the rendering loop and input handling.

#### `Toolbar.tsx`
- **Edit Mode toggle** — switches between edit mode (click to toggle cells) and view mode (click to pan).
- **Step button** — advances the simulation by one generation.
- **Step N button** — opens an inline input for entering N, then advances N generations.
- **Run button** — starts continuous simulation.
- **Stop button** — stops continuous simulation.
- **Speed slider** — controls ms-per-generation for continuous mode (range: 50ms to 2000ms).
- **Clear button** — clears all live cells and resets generation to 0.

#### `PatternPanel.tsx`
- Divided into two sections: **Samples** and **My Patterns**.
- Each entry shows the pattern name; clicking loads it onto the grid.
- User patterns have a delete button (with confirmation).
- A **Save** button at the bottom opens `SavePatternDialog`.

#### `SavePatternDialog.tsx`
- Modal overlay with fields: Name (required), Description (optional), Author (optional).
- On submit, serializes current live cells and POSTs to the server.
- Validates that the name is non-empty and not a duplicate.

#### `StepInput.tsx`
- Small inline input (number) with a "Go" button.
- On submit, calls `engine.stepN(n)`.

#### `StatusBar.tsx`
- Displays: current generation number, live cell population count, and the grid coordinates under the mouse cursor.

---

## 8. API Endpoints

All endpoints are prefixed with `/api`.

### `GET /api/patterns`

List all available patterns (samples + user).

**Response:**

```json
{
  "samples": [
    { "name": "Glider", "filename": "glider.json", "category": "spaceship" }
  ],
  "user": [
    { "name": "My Pattern", "filename": "my-pattern.json" }
  ]
}
```

### `GET /api/patterns/:source/:filename`

Load a specific pattern. `:source` is either `samples` or `user`.

**Response:** The full pattern JSON object.

### `POST /api/patterns`

Save a new user pattern.

**Request body:** Pattern JSON (without `createdAt`/`updatedAt` — server adds those).

**Response:** `201 Created` with the saved pattern JSON.

**Filename derivation:** `name` is slugified (lowercased, spaces to hyphens, special chars removed) + `.json`.

### `PUT /api/patterns/:filename`

Update an existing user pattern.

**Request body:** Partial or full pattern JSON. Server updates `updatedAt`.

**Response:** `200 OK` with the updated pattern JSON.

### `DELETE /api/patterns/:filename`

Delete a user pattern.

**Response:** `204 No Content`.

**Guard:** Returns `403 Forbidden` if the pattern is in `samples/`.

### Error Responses

All errors return a JSON body:

```json
{
  "error": "Pattern not found"
}
```

| Status | Meaning                                |
| ------ | -------------------------------------- |
| 400    | Invalid request body / missing fields  |
| 403    | Attempt to modify/delete a sample      |
| 404    | Pattern file not found                 |
| 409    | Pattern with that name already exists   |
| 500    | Server/file system error               |

---

## 9. Pre-Created Sample Patterns

The following classic patterns are shipped in `patterns/samples/`:

| File                       | Name                    | Category     | Description                                |
| -------------------------- | ----------------------- | ------------ | ------------------------------------------ |
| `block.json`               | Block                   | still-life   | 2x2 square; simplest still life            |
| `blinker.json`             | Blinker                 | oscillator   | Period-2 oscillator; 3 cells in a line      |
| `toad.json`                | Toad                    | oscillator   | Period-2 oscillator; 6 cells               |
| `beacon.json`              | Beacon                  | oscillator   | Period-2 oscillator; two offset 2x2 blocks |
| `pulsar.json`              | Pulsar                  | oscillator   | Period-3 oscillator; 48 cells              |
| `glider.json`              | Glider                  | spaceship    | Smallest spaceship; moves diagonally       |
| `lightweight-spaceship.json` | Lightweight Spaceship | spaceship    | Moves horizontally                         |
| `r-pentomino.json`         | R-pentomino             | methuselah   | 5 cells; stabilizes after 1103 generations |
| `diehard.json`             | Diehard                 | methuselah   | 7 cells; dies after 130 generations        |
| `gosper-glider-gun.json`   | Gosper Glider Gun       | gun          | Emits a glider every 30 generations        |

---

## 10. State Management

State is managed via React hooks at the `App` level — no external state library is needed for this scope.

### `useGameEngine` hook

```typescript
interface UseGameEngineReturn {
  liveCells: Set<CellKey>;
  generation: number;
  population: number;
  isRunning: boolean;
  speed: number;

  step: () => void;
  stepN: (n: number) => void;
  run: () => void;
  stop: () => void;
  setSpeed: (ms: number) => void;
  toggleCell: (col: number, row: number) => void;
  clear: () => void;
  loadCells: (cells: [number, number][]) => void;
}
```

### `useCanvas` hook

```typescript
interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cursorGridPos: { col: number; row: number } | null;
  resetView: () => void;
}
```

Handles `requestAnimationFrame` loop, mouse/wheel event listeners, and coordinate transforms internally.

### `usePatterns` hook

```typescript
interface UsePatternsReturn {
  samples: PatternMeta[];
  userPatterns: PatternMeta[];
  loading: boolean;
  loadPattern: (source: string, filename: string) => Promise<Pattern>;
  savePattern: (pattern: Omit<Pattern, "createdAt" | "updatedAt">) => Promise<Pattern>;
  deletePattern: (filename: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

---

## 11. Development & Scripts

### `package.json` scripts

| Script          | Command                                                              | Purpose                                      |
| --------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `dev`           | `concurrently "vite" "tsx watch server/index.ts"`                    | Run frontend + backend in dev mode           |
| `build`         | `vite build`                                                         | Build frontend for production                |
| `start`         | `tsx server/index.ts`                                                | Run production server (serves built frontend + API) |
| `electron:dev`  | `concurrently "vite" "tsx watch server/index.ts" "electron electron/main.ts"` | Run in Electron with dev servers    |
| `electron:build`| `vite build && electron-builder`                                     | Build Electron distributable                 |
| `lint`          | `eslint src/ server/`                                                | Lint all TypeScript                          |

### Vite Proxy Configuration

In development, Vite's dev server proxies `/api` requests to the Express server to avoid CORS issues:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

The Express server runs on port **3001**. The Vite dev server runs on its default port **5173**.

In production, the Express server serves the built frontend from `dist/` and handles `/api` routes directly.

---

## 12. Electron Desktop Shell

### 12.1 Overview

The application can optionally run inside an Electron shell, providing a native desktop experience. Electron wraps the same React frontend and Express backend into a standalone application window.

### 12.2 Architecture

```
┌─────────────────────────────────┐
│  Electron Main Process          │
│  (electron/main.ts)             │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Express Server (embedded) │  │
│  │ Port 3001                 │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ BrowserWindow             │  │
│  │ loads http://localhost:5173│  │
│  │ (dev) or dist/index.html  │  │
│  │ (production)              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 12.3 Main Process (`electron/main.ts`)

The Electron main process:

1. Starts the Express API server (port 3001).
2. Creates a `BrowserWindow`.
3. In development, loads `http://localhost:5173` (Vite dev server).
4. In production, loads the built `dist/index.html` via `file://` protocol and starts the Express server for API access.

### 12.4 Build & Distribution

Uses `electron-builder` for packaging. Configuration in `package.json`:

```json
{
  "build": {
    "appId": "com.gameoflife.app",
    "productName": "Game of Life",
    "files": ["dist/**/*", "server/**/*", "patterns/**/*", "electron/**/*"],
    "directories": { "output": "release" }
  }
}
```

### 12.5 Development Workflow

- `npm run dev` — Web-only mode (Vite + Express, no Electron).
- `npm run electron:dev` — Full desktop mode (Vite + Express + Electron window).
- `npm run electron:build` — Build production Electron distributable.

---

## 13. Future Considerations (Out of Scope for v1)

These are noted for potential future work but are **not** part of the initial implementation:

- **Web Worker** for simulation computation on large grids to prevent UI thread blocking.
- **HashLife algorithm** for dramatically faster simulation of large, repetitive patterns.
- **Undo/Redo** for edit mode changes.
- **Pattern import/export** in standard formats (RLE, Plaintext).
- **Toroidal grid** option (wrapping edges) as an alternative to infinite grid.
- **Touch support** for mobile devices (pinch-to-zoom, touch-to-pan).
