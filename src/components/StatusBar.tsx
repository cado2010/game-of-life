interface StatusBarProps {
  generation: number;
  population: number;
  cursorPos: { col: number; row: number } | null;
}

export function StatusBar({ generation, population, cursorPos }: StatusBarProps) {
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
    </div>
  );
}
