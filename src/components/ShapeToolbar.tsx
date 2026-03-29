export type ShapeTool = "freeform" | "line" | "rect" | "filled-rect" | "ellipse";

interface ShapeToolbarProps {
  activeTool: ShapeTool;
  onSelectTool: (tool: ShapeTool) => void;
}

const tools: { id: ShapeTool; label: string; icon: string }[] = [
  { id: "freeform", label: "Freeform", icon: "✏️" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "rect", label: "Rectangle", icon: "▭" },
  { id: "filled-rect", label: "Filled Rect", icon: "■" },
  { id: "ellipse", label: "Ellipse", icon: "◯" },
];

export function ShapeToolbar({ activeTool, onSelectTool }: ShapeToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/90 rounded-md border border-gray-700">
      <span className="text-[10px] text-gray-500 mr-1 uppercase tracking-wider">
        Shape
      </span>
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          title={t.label}
          className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
            activeTool === t.id
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
