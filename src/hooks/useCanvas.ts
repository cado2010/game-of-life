import { useRef, useEffect, useCallback, useState } from "react";
import type { CellKey } from "../engine/types";
import { parseKey } from "../engine/types";
import type { ShapeTool } from "../components/ShapeToolbar";

interface UseCanvasOptions {
  liveCells: Set<CellKey>;
  editMode: boolean;
  shapeTool: ShapeTool;
  onCellToggle: (col: number, row: number) => void;
  onCellSet: (col: number, row: number, alive: boolean) => void;
  onSetCells: (cells: [number, number][], alive: boolean) => void;
}

export interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cursorGridPos: { col: number; row: number } | null;
  resetView: () => void;
}

const MIN_CELL_SIZE = 2;
const MAX_CELL_SIZE = 80;
const DEFAULT_CELL_SIZE = 20;

const GRID_LINE_COLOR = "rgba(55, 65, 81, 0.5)";
const GRID_MAJOR_COLOR = "rgba(75, 85, 99, 0.7)";
const CELL_COLOR = "#22d3ee";
const CURSOR_COLOR = "rgba(34, 211, 238, 0.3)";
const PREVIEW_COLOR = "rgba(34, 211, 238, 0.45)";
const ERASE_PREVIEW_COLOR = "rgba(239, 68, 68, 0.35)";
const BG_COLOR = "#030712";

// --- shape geometry helpers ---

function bresenhamLine(
  x0: number, y0: number, x1: number, y1: number
): [number, number][] {
  const pts: [number, number][] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let cx = x0, cy = y0;
  while (true) {
    pts.push([cx, cy]);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
  return pts;
}

function rectOutline(
  c0: number, r0: number, c1: number, r1: number
): [number, number][] {
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const pts: [number, number][] = [];
  for (let c = minC; c <= maxC; c++) { pts.push([c, minR]); pts.push([c, maxR]); }
  for (let r = minR + 1; r < maxR; r++) { pts.push([minC, r]); pts.push([maxC, r]); }
  return pts;
}

function filledRect(
  c0: number, r0: number, c1: number, r1: number
): [number, number][] {
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const pts: [number, number][] = [];
  for (let c = minC; c <= maxC; c++)
    for (let r = minR; r <= maxR; r++) pts.push([c, r]);
  return pts;
}

function ellipseOutline(
  c0: number, r0: number, c1: number, r1: number
): [number, number][] {
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const cx = (minC + maxC) / 2;
  const cy = (minR + maxR) / 2;
  const rx = (maxC - minC) / 2;
  const ry = (maxR - minR) / 2;

  if (rx < 0.5 && ry < 0.5) return [[Math.round(cx), Math.round(cy)]];
  if (rx < 0.5) {
    const pts: [number, number][] = [];
    for (let r = minR; r <= maxR; r++) pts.push([Math.round(cx), r]);
    return pts;
  }
  if (ry < 0.5) {
    const pts: [number, number][] = [];
    for (let c = minC; c <= maxC; c++) pts.push([c, Math.round(cy)]);
    return pts;
  }

  const set = new Set<string>();
  const pts: [number, number][] = [];
  const add = (col: number, row: number) => {
    const k = `${col},${row}`;
    if (!set.has(k)) { set.add(k); pts.push([col, row]); }
  };

  const steps = Math.max(200, Math.ceil(Math.max(rx, ry) * 8));
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const col = Math.round(cx + rx * Math.cos(angle));
    const row = Math.round(cy + ry * Math.sin(angle));
    add(col, row);
  }
  return pts;
}

function filledEllipse(
  c0: number, r0: number, c1: number, r1: number
): [number, number][] {
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const cx = (minC + maxC) / 2;
  const cy = (minR + maxR) / 2;
  const rx = (maxC - minC) / 2;
  const ry = (maxR - minR) / 2;

  const pts: [number, number][] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const dx = (c - cx) / (rx || 0.5);
      const dy = (r - cy) / (ry || 0.5);
      if (dx * dx + dy * dy <= 1.0001) {
        pts.push([c, r]);
      }
    }
  }
  return pts;
}

function computeShapeCells(
  tool: ShapeTool,
  start: { col: number; row: number },
  end: { col: number; row: number }
): [number, number][] {
  switch (tool) {
    case "line":
      return bresenhamLine(start.col, start.row, end.col, end.row);
    case "rect":
      return rectOutline(start.col, start.row, end.col, end.row);
    case "filled-rect":
      return filledRect(start.col, start.row, end.col, end.row);
    case "ellipse":
      return ellipseOutline(start.col, start.row, end.col, end.row);
    case "filled-ellipse":
      return filledEllipse(start.col, start.row, end.col, end.row);
    default:
      return [];
  }
}

export function useCanvas({
  liveCells,
  editMode,
  shapeTool,
  onCellToggle,
  onCellSet,
  onSetCells,
}: UseCanvasOptions): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cursorGridPos, setCursorGridPos] = useState<{
    col: number;
    row: number;
  } | null>(null);

  const offsetRef = useRef({ x: 0, y: 0 });
  const cellSizeRef = useRef(DEFAULT_CELL_SIZE);
  const isDraggingRef = useRef(false);
  const isEditDraggingRef = useRef(false);
  const editPaintValueRef = useRef(true);
  const lastEditCellRef = useRef<{ col: number; row: number } | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const liveCellsRef = useRef(liveCells);
  const editModeRef = useRef(editMode);
  const shapeToolRef = useRef(shapeTool);
  const cursorScreenRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef(0);
  const onCellSetRef = useRef(onCellSet);
  const onCellToggleRef = useRef(onCellToggle);
  const onSetCellsRef = useRef(onSetCells);

  // Shape drag state
  const isShapeDraggingRef = useRef(false);
  const shapeStartRef = useRef<{ col: number; row: number } | null>(null);
  const shapeEndRef = useRef<{ col: number; row: number } | null>(null);
  const shapePaintValueRef = useRef(true);

  onCellSetRef.current = onCellSet;
  onCellToggleRef.current = onCellToggle;
  onSetCellsRef.current = onSetCells;
  liveCellsRef.current = liveCells;
  editModeRef.current = editMode;
  shapeToolRef.current = shapeTool;

  const screenToGrid = useCallback((sx: number, sy: number) => {
    const cs = cellSizeRef.current;
    const { x: ox, y: oy } = offsetRef.current;
    return {
      col: Math.floor((sx - ox) / cs),
      row: Math.floor((sy - oy) / cs),
    };
  }, []);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cellSizeRef.current = DEFAULT_CELL_SIZE;
    offsetRef.current = {
      x: Math.floor(canvas.width / 2),
      y: Math.floor(canvas.height / 2),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }
    });
    resizeObserver.observe(canvas.parentElement!);

    offsetRef.current = {
      x: Math.floor(canvas.clientWidth / 2),
      y: Math.floor(canvas.clientHeight / 2),
    };

    function draw() {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      const cs = cellSizeRef.current;
      const { x: ox, y: oy } = offsetRef.current;

      ctx!.fillStyle = BG_COLOR;
      ctx!.fillRect(0, 0, w, h);

      const startCol = Math.floor(-ox / cs);
      const endCol = Math.ceil((w - ox) / cs);
      const startRow = Math.floor(-oy / cs);
      const endRow = Math.ceil((h - oy) / cs);

      let gridStep = 1;
      if (cs < 4) gridStep = 20;
      else if (cs < 8) gridStep = 10;
      else if (cs < 14) gridStep = 5;

      ctx!.lineWidth = 0.5;

      for (
        let col = startCol - (((startCol % gridStep) + gridStep) % gridStep);
        col <= endCol;
        col += gridStep
      ) {
        const x = col * cs + ox;
        ctx!.strokeStyle =
          col % (gridStep * 5) === 0 ? GRID_MAJOR_COLOR : GRID_LINE_COLOR;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }

      for (
        let row = startRow - (((startRow % gridStep) + gridStep) % gridStep);
        row <= endRow;
        row += gridStep
      ) {
        const y = row * cs + oy;
        ctx!.strokeStyle =
          row % (gridStep * 5) === 0 ? GRID_MAJOR_COLOR : GRID_LINE_COLOR;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      // Draw live cells
      ctx!.fillStyle = CELL_COLOR;
      const pad = Math.max(1, cs * 0.05);
      for (const key of liveCellsRef.current) {
        const [col, row] = parseKey(key);
        if (col >= startCol && col <= endCol && row >= startRow && row <= endRow) {
          ctx!.fillRect(
            col * cs + ox + pad,
            row * cs + oy + pad,
            cs - pad * 2,
            cs - pad * 2
          );
        }
      }

      // Draw shape preview
      if (isShapeDraggingRef.current && shapeStartRef.current && shapeEndRef.current) {
        ctx!.fillStyle = shapePaintValueRef.current ? PREVIEW_COLOR : ERASE_PREVIEW_COLOR;
        const tool = shapeToolRef.current;
        const s = shapeStartRef.current;
        const e = shapeEndRef.current;

        if (tool === "filled-rect" || tool === "filled-ellipse") {
          const minC = Math.max(Math.min(s.col, e.col), startCol);
          const maxC = Math.min(Math.max(s.col, e.col), endCol);
          const minR = Math.max(Math.min(s.row, e.row), startRow);
          const maxR = Math.min(Math.max(s.row, e.row), endRow);

          if (tool === "filled-rect") {
            for (let c = minC; c <= maxC; c++)
              for (let r = minR; r <= maxR; r++)
                ctx!.fillRect(c * cs + ox, r * cs + oy, cs, cs);
          } else {
            const cxE = (Math.min(s.col, e.col) + Math.max(s.col, e.col)) / 2;
            const cyE = (Math.min(s.row, e.row) + Math.max(s.row, e.row)) / 2;
            const rxE = (Math.max(s.col, e.col) - Math.min(s.col, e.col)) / 2 || 0.5;
            const ryE = (Math.max(s.row, e.row) - Math.min(s.row, e.row)) / 2 || 0.5;
            for (let c = minC; c <= maxC; c++)
              for (let r = minR; r <= maxR; r++) {
                const dx = (c - cxE) / rxE, dy = (r - cyE) / ryE;
                if (dx * dx + dy * dy <= 1.0001)
                  ctx!.fillRect(c * cs + ox, r * cs + oy, cs, cs);
              }
          }
        } else {
          const previewCells = computeShapeCells(tool, s, e);
          for (const [col, row] of previewCells) {
            if (col >= startCol && col <= endCol && row >= startRow && row <= endRow)
              ctx!.fillRect(col * cs + ox, row * cs + oy, cs, cs);
          }
        }
      }

      // Draw cursor highlight in edit mode
      if (editModeRef.current && cursorScreenRef.current && !isShapeDraggingRef.current) {
        const { col, row } = screenToGrid(
          cursorScreenRef.current.x,
          cursorScreenRef.current.y
        );
        ctx!.fillStyle = CURSOR_COLOR;
        ctx!.fillRect(col * cs + ox, row * cs + oy, cs, cs);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [screenToGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleMouseDown(e: MouseEvent) {
      // Right-click panning in edit mode
      if (editModeRef.current && e.button === 2) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.button !== 0) return;

      if (editModeRef.current) {
        const rect = canvas!.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { col, row } = screenToGrid(sx, sy);

        const tool = shapeToolRef.current;
        const wasAlive = liveCellsRef.current.has(
          `${col},${row}` as CellKey
        );
        const paintOn = !wasAlive;

        if (tool === "freeform") {
          editPaintValueRef.current = paintOn;
          onCellToggleRef.current(col, row);
          isEditDraggingRef.current = true;
          lastEditCellRef.current = { col, row };
        } else {
          shapePaintValueRef.current = paintOn;
          isShapeDraggingRef.current = true;
          shapeStartRef.current = { col, row };
          shapeEndRef.current = { col, row };
        }
      } else {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function handleContextMenu(e: MouseEvent) {
      if (editModeRef.current) e.preventDefault();
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      cursorScreenRef.current = { x: sx, y: sy };
      const gridPos = screenToGrid(sx, sy);
      setCursorGridPos(gridPos);

      if (isShapeDraggingRef.current && shapeStartRef.current) {
        shapeEndRef.current = gridPos;
      } else if (isEditDraggingRef.current) {
        const last = lastEditCellRef.current;
        if (!last || gridPos.col !== last.col || gridPos.row !== last.row) {
          if (last) {
            const pts = bresenhamLine(last.col, last.row, gridPos.col, gridPos.row);
            for (const [px, py] of pts) {
              onCellSetRef.current(px, py, editPaintValueRef.current);
            }
          } else {
            onCellSetRef.current(gridPos.col, gridPos.row, editPaintValueRef.current);
          }
          lastEditCellRef.current = { col: gridPos.col, row: gridPos.row };
        }
      } else if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        offsetRef.current = {
          x: offsetRef.current.x + dx,
          y: offsetRef.current.y + dy,
        };
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function handleMouseUp() {
      if (isShapeDraggingRef.current && shapeStartRef.current && shapeEndRef.current) {
        const cells = computeShapeCells(
          shapeToolRef.current,
          shapeStartRef.current,
          shapeEndRef.current
        );
        if (cells.length > 0) {
          onSetCellsRef.current(cells, shapePaintValueRef.current);
        }
        shapeStartRef.current = null;
        shapeEndRef.current = null;
      }

      isDraggingRef.current = false;
      isEditDraggingRef.current = false;
      isShapeDraggingRef.current = false;
      lastEditCellRef.current = null;
    }

    function handleMouseLeave() {
      isDraggingRef.current = false;
      isEditDraggingRef.current = false;
      isShapeDraggingRef.current = false;
      shapeStartRef.current = null;
      shapeEndRef.current = null;
      lastEditCellRef.current = null;
      cursorScreenRef.current = null;
      setCursorGridPos(null);
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const oldSize = cellSizeRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newSize = Math.min(
        MAX_CELL_SIZE,
        Math.max(MIN_CELL_SIZE, oldSize * zoomFactor)
      );

      const scale = newSize / oldSize;
      offsetRef.current = {
        x: mx - (mx - offsetRef.current.x) * scale,
        y: my - (my - offsetRef.current.y) * scale,
      };
      cellSizeRef.current = newSize;
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [screenToGrid]);

  return { canvasRef, cursorGridPos, resetView };
}
