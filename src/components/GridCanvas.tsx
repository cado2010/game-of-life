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
  onSetCells: (cells: [number, number][], alive: boolean) => void;
  onCursorMove: (pos: { col: number; row: number } | null) => void;
  onResetViewReady: (resetFn: () => void) => void;
}

function statusText(tool: ShapeTool, isPasting: boolean): string {
  if (isPasting) return "click to paste — Esc to cancel";
  if (tool === "select") return "drag to select region, then click to paste";
  if (tool === "freeform") return "click or drag to draw";
  return `drag to draw ${tool}`;
}

export function GridCanvas({
  liveCells,
  editMode,
  shapeTool,
  onShapeToolChange,
  onCellToggle,
  onCellSet,
  onSetCells,
  onCursorMove,
  onResetViewReady,
}: GridCanvasProps) {
  const { canvasRef, cursorGridPos, isPasting, hasClipboard, cancelPaste, resetView } = useCanvas({
    liveCells,
    editMode,
    shapeTool,
    onCellToggle,
    onCellSet,
    onSetCells,
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
            EDIT MODE — {statusText(shapeTool, isPasting)}
          </div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2">
            <ShapeToolbar
              activeTool={shapeTool}
              isPasting={isPasting}
              hasClipboard={hasClipboard}
              onSelectTool={(tool) => {
                cancelPaste();
                onShapeToolChange(tool);
              }}
              onCancelPaste={cancelPaste}
            />
          </div>
        </>
      )}
    </div>
  );
}
