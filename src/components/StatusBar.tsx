import { PopulationGraph } from "./PopulationGraph";

interface StatusBarProps {
  generation: number;
  population: number;
  cursorPos: { col: number; row: number } | null;
  popHistory: number[];
}

export function StatusBar({ generation, population, cursorPos, popHistory }: StatusBarProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-1.5 bg-gray-900 border-t border-gray-800 text-xs text-gray-400 font-mono">
      <span>
        Gen: <span className="text-gray-200">{generation}</span>
      </span>
      <span>
        Population: <span className="text-gray-200">{population}</span>
      </span>
      <span>
        Cursor:{" "}
        <span className="text-gray-200">
          {cursorPos ? `(${cursorPos.col}, ${cursorPos.row})` : "—"}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[10px] text-gray-500">POP</span>
        <PopulationGraph history={popHistory} width={200} height={28} />
      </div>
    </div>
  );
}
