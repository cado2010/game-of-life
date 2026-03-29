export type ShapeTool = "freeform" | "line" | "rect" | "filled-rect" | "ellipse" | "filled-ellipse" | "select";

interface ShapeToolbarProps {
  activeTool: ShapeTool;
  isPasting: boolean;
  hasClipboard: boolean;
  onSelectTool: (tool: ShapeTool) => void;
  onCancelPaste: () => void;
}

const drawTools: { id: ShapeTool; label: string; icon: string }[] = [
  { id: "freeform", label: "Freeform", icon: "✏️" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "rect", label: "Rectangle", icon: "▭" },
  { id: "filled-rect", label: "Filled Rect", icon: "■" },
  { id: "ellipse", label: "Ellipse", icon: "◯" },
  { id: "filled-ellipse", label: "Filled Ellipse", icon: "●" },
];

export function ShapeToolbar({
  activeTool,
  isPasting,
  hasClipboard,
  onSelectTool,
  onCancelPaste,
}: ShapeToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/90 rounded-md border border-gray-700">
      <span className="text-[10px] text-gray-500 mr-1 uppercase tracking-wider">
        Draw
      </span>
      {drawTools.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          title={t.label}
          className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
            activeTool === t.id && !isPasting
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-600 mx-1" />

      <span className="text-[10px] text-gray-500 mr-1 uppercase tracking-wider">
        Copy
      </span>
      <button
        onClick={() => onSelectTool("select")}
        title="Select & Copy (drag to select, then click to paste)"
        className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
          activeTool === "select" && !isPasting
            ? "bg-cyan-600 text-white"
            : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
        }`}
      >
        ⬚
      </button>

      {isPasting && (
        <button
          onClick={onCancelPaste}
          title="Cancel paste (Esc)"
          className="w-7 h-7 flex items-center justify-center rounded text-sm bg-red-700 text-red-100 hover:bg-red-600 transition-colors"
        >
          ✕
        </button>
      )}

      {hasClipboard && !isPasting && activeTool !== "select" && (
        <button
          onClick={() => onSelectTool("select")}
          title="Paste clipboard (switch to Select tool to paste)"
          className="px-2 h-7 flex items-center justify-center rounded text-[10px] bg-amber-700/70 text-amber-200 hover:bg-amber-600 transition-colors"
        >
          📋 Paste
        </button>
      )}
    </div>
  );
}
