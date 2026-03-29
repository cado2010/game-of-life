import { useEffect } from "react";
import { useCanvas } from "../hooks/useCanvas";
import type { CellKey } from "../engine/types";

interface GridCanvasProps {
  liveCells: Set<CellKey>;
  editMode: boolean;
  onCellToggle: (col: number, row: number) => void;
  onCursorMove: (pos: { col: number; row: number } | null) => void;
  onResetViewReady: (resetFn: () => void) => void;
}

export function GridCanvas({
  liveCells,
  editMode,
  onCellToggle,
  onCursorMove,
  onResetViewReady,
}: GridCanvasProps) {
  const { canvasRef, cursorGridPos, resetView } = useCanvas({
    liveCells,
    editMode,
    onCellToggle,
  });

  useEffect(() => {
    onResetViewReady(resetView);
  }, [resetView, onResetViewReady]);

  useEffect(() => {
    onCursorMove(cursorGridPos);
  }, [cursorGridPos, onCursorMove]);

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
