import { useCanvas } from "../hooks/useCanvas";
import type { CellKey } from "../engine/types";

interface GridCanvasProps {
  liveCells: Set<CellKey>;
  editMode: boolean;
  onCellToggle: (col: number, row: number) => void;
  onCursorMove: (pos: { col: number; row: number } | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function GridCanvas({
  liveCells,
  editMode,
  onCellToggle,
  onCursorMove,
  canvasRef: externalRef,
}: GridCanvasProps) {
  const { canvasRef, cursorGridPos } = useCanvas({
    liveCells,
    editMode,
    onCellToggle,
  });

  // Sync internal ref to external
  if (externalRef && "current" in externalRef) {
    (externalRef as React.MutableRefObject<HTMLCanvasElement | null>).current =
      canvasRef.current;
  }

  // Report cursor position upward
  if (onCursorMove) {
    // Using a simple effect-like approach — check on every render
    const cur = cursorGridPos;
    queueMicrotask(() => onCursorMove(cur));
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
      />
      {editMode && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-cyan-900/80 text-cyan-200 text-xs font-medium rounded">
          EDIT MODE — click to toggle cells
        </div>
      )}
    </div>
  );
}
