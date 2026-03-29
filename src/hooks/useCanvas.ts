import { useRef, useEffect, useCallback, useState } from "react";
import type { CellKey } from "../engine/types";
import { parseKey } from "../engine/types";

interface UseCanvasOptions {
  liveCells: Set<CellKey>;
  editMode: boolean;
  onCellToggle: (col: number, row: number) => void;
  onCellSet: (col: number, row: number, alive: boolean) => void;
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
const BG_COLOR = "#030712";

export function useCanvas({
  liveCells,
  editMode,
  onCellToggle,
  onCellSet,
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
  const cursorScreenRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef(0);
  const onCellSetRef = useRef(onCellSet);
  onCellSetRef.current = onCellSet;

  liveCellsRef.current = liveCells;
  editModeRef.current = editMode;

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

      // Adaptive grid line drawing
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

      // Draw cursor highlight in edit mode
      if (editModeRef.current && cursorScreenRef.current) {
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
      if (e.button !== 0) return;

      if (editModeRef.current) {
        const rect = canvas!.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { col, row } = screenToGrid(sx, sy);
        const wasAlive = liveCellsRef.current.has(`${col},${row}` as import("../engine/types").CellKey);
        editPaintValueRef.current = !wasAlive;
        onCellToggle(col, row);
        isEditDraggingRef.current = true;
        lastEditCellRef.current = { col, row };
      } else {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      cursorScreenRef.current = { x: sx, y: sy };
      const gridPos = screenToGrid(sx, sy);
      setCursorGridPos(gridPos);

      if (isEditDraggingRef.current) {
        const last = lastEditCellRef.current;
        if (!last || gridPos.col !== last.col || gridPos.row !== last.row) {
          if (last) {
            let x0 = last.col, y0 = last.row;
            const x1 = gridPos.col, y1 = gridPos.row;
            const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            while (true) {
              onCellSetRef.current(x0, y0, editPaintValueRef.current);
              if (x0 === x1 && y0 === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x0 += sx; }
              if (e2 <= dx) { err += dx; y0 += sy; }
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
      isDraggingRef.current = false;
      isEditDraggingRef.current = false;
      lastEditCellRef.current = null;
    }

    function handleMouseLeave() {
      isDraggingRef.current = false;
      isEditDraggingRef.current = false;
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

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [screenToGrid, onCellToggle]);

  return { canvasRef, cursorGridPos, resetView };
}
