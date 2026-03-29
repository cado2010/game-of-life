import { useState } from "react";
import type { PatternMeta, Pattern } from "../engine/types";
import { SavePatternDialog } from "./SavePatternDialog";

interface PatternPanelProps {
  samples: PatternMeta[];
  userPatterns: PatternMeta[];
  loading: boolean;
  onLoadPattern: (source: string, filename: string) => Promise<Pattern>;
  onSavePattern: (
    pattern: Omit<Pattern, "createdAt" | "updatedAt">
  ) => Promise<Pattern>;
  onDeletePattern: (filename: string) => Promise<void>;
  getLiveCells: () => [number, number][];
  onPatternLoaded: (cells: [number, number][]) => void;
}

export function PatternPanel({
  samples,
  userPatterns,
  loading,
  onLoadPattern,
  onSavePattern,
  onDeletePattern,
  getLiveCells,
  onPatternLoaded,
}: PatternPanelProps) {
  const [showSave, setShowSave] = useState(false);
  const [activePattern, setActivePattern] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleLoad(source: string, filename: string) {
    setActivePattern(`${source}/${filename}`);
    try {
      const pattern = await onLoadPattern(source, filename);
      onPatternLoaded(pattern.cells);
    } catch (err) {
      console.error("Failed to load pattern:", err);
    }
  }

  async function handleDelete(filename: string) {
    try {
      await onDeletePattern(filename);
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete pattern:", err);
    }
  }

  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Patterns
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-4 text-sm text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="px-3 pt-3 pb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Samples
              </h3>
            </div>
            {samples.map((p) => (
              <button
                key={`samples/${p.filename}`}
                onClick={() => handleLoad("samples", p.filename)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  activePattern === `samples/${p.filename}`
                    ? "bg-cyan-900/40 text-cyan-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <span>{p.name}</span>
                {p.category && (
                  <span className="ml-2 text-xs text-gray-600">
                    {p.category}
                  </span>
                )}
              </button>
            ))}

            <div className="px-3 pt-4 pb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                My Patterns
              </h3>
            </div>
            {userPatterns.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600 italic">
                No saved patterns yet
              </div>
            ) : (
              userPatterns.map((p) => (
                <div
                  key={`user/${p.filename}`}
                  className={`group flex items-center px-3 py-1.5 transition-colors ${
                    activePattern === `user/${p.filename}`
                      ? "bg-cyan-900/40"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <button
                    onClick={() => handleLoad("user", p.filename)}
                    className={`flex-1 text-left text-sm ${
                      activePattern === `user/${p.filename}`
                        ? "text-cyan-200"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {p.name}
                  </button>
                  {confirmDelete === p.filename ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(p.filename)}
                        className="text-xs text-red-400 hover:text-red-300 px-1"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 px-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.filename)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-gray-600 hover:text-red-400 px-1 transition-opacity"
                    >
                      Del
                    </button>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-800">
        <button
          onClick={() => setShowSave(true)}
          className="w-full px-3 py-1.5 rounded text-sm font-medium bg-cyan-700 text-cyan-100 hover:bg-cyan-600 transition-colors"
        >
          Save Current Pattern
        </button>
      </div>

      {showSave && (
        <SavePatternDialog
          getLiveCells={getLiveCells}
          onSave={onSavePattern}
          onClose={() => setShowSave(false)}
        />
      )}
    </div>
  );
}
