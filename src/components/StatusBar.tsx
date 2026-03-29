import { useState, useCallback } from "react";
import { PopulationGraph } from "./PopulationGraph";
import { PopulationGraphPopup } from "./PopulationGraphPopup";

interface StatusBarProps {
  generation: number;
  population: number;
  cursorPos: { col: number; row: number } | null;
  popHistory: number[];
  popHistoryStartGen: number;
}

export function StatusBar({ generation, population, cursorPos, popHistory, popHistoryStartGen }: StatusBarProps) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);

  const handleDoubleClick = useCallback(() => {
    if (popupOpen) {
      setRecenterSignal((n) => n + 1);
    } else {
      setPopupOpen(true);
    }
  }, [popupOpen]);

  return (
    <>
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
        <div
          className="ml-auto flex items-center gap-2 cursor-pointer"
          onDoubleClick={handleDoubleClick}
          title={popupOpen ? "Double-click to recenter popup" : "Double-click to enlarge"}
        >
          <PopulationGraph history={popHistory} startGeneration={popHistoryStartGen} width={240} height={56} />
        </div>
      </div>

      {popupOpen && (
        <PopulationGraphPopup
          history={popHistory}
          startGeneration={popHistoryStartGen}
          recenterSignal={recenterSignal}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}
