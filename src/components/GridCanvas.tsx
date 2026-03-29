import { useEffect } from "react";
import { useCanvas } from "../hooks/useCanvas";
import type { CellKey } from "../engine/types";
import { ShapeToolbar, type ShapeTool } from "./ShapeToolbar";

interface GridCanvasProps {
  liveCells: Set<CellKey>;
  editMode: boolean;
  shapeTool: ShapeTool;
  onShapeToolChange: (tool: ShapeTool) => void;
  onCellToggle: (col: number, row: number) => void;
  onCellSet: (col: number, row: number, alive: boolean) => void;
  onCursorMove: (pos: { col: number; row: number } | null) => void;
  onResetViewReady: (resetFn: () => void) => void;
}

export function GridCanvas({
  liveCells,
  editMode,
  shapeTool,
  onShapeToolChange,
  onCellToggle,
  onCellSet,
  onCursorMove,
  onResetViewReady,
}: GridCanvasProps) {
  const { canvasRef, cursorGridPos, resetView } = useCanvas({
    liveCells,
    editMode,
    shapeTool,
    onCellToggle,
    onCellSet,
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
        <>
          <div className="absolute top-3 left-3 px-2 py-1 bg-cyan-900/80 text-cyan-200 text-xs font-medium rounded">
            EDIT MODE — {shapeTool === "freeform" ? "click or drag to draw" : `drag to draw ${shapeTool}`}
          </div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2">
            <ShapeToolbar activeTool={shapeTool} onSelectTool={onShapeToolChange} />
          </div>
        </>
      )}
    </div>
  );
}
