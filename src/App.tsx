import { useState, useRef, useCallback, useEffect } from "react";
import { GridCanvas } from "./components/GridCanvas";
import { Toolbar } from "./components/Toolbar";
import { PatternPanel } from "./components/PatternPanel";
import { StatusBar } from "./components/StatusBar";
import { useGameEngine } from "./hooks/useGameEngine";
import { usePatterns } from "./hooks/usePatterns";

const MAX_HISTORY = 100;

export function App() {
  const engine = useGameEngine();
  const patterns = usePatterns();
  const [editMode, setEditMode] = useState(false);
  const [cursorPos, setCursorPos] = useState<{
    col: number;
    row: number;
  } | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [popHistory, setPopHistory] = useState<number[]>([]);
  const [popStartGen, setPopStartGen] = useState(0);
  const prevGenRef = useRef(-1);

  useEffect(() => {
    if (engine.generation === 0) {
      setPopHistory([engine.population]);
      setPopStartGen(0);
      prevGenRef.current = 0;
    } else if (engine.generation !== prevGenRef.current) {
      setPopHistory((prev) => {
        const next = [...prev, engine.population];
        if (next.length > MAX_HISTORY) {
          const trimmed = next.slice(next.length - MAX_HISTORY);
          setPopStartGen(engine.generation - trimmed.length + 1);
          return trimmed;
        }
        return next;
      });
      prevGenRef.current = engine.generation;
    }
  }, [engine.generation, engine.population]);

  const handleCursorMove = useCallback(
    (pos: { col: number; row: number } | null) => {
      setCursorPos(pos);
    },
    []
  );

  const handleResetViewReady = useCallback((resetFn: () => void) => {
    resetViewRef.current = resetFn;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <Toolbar
        editMode={editMode}
        isRunning={engine.isRunning}
        speed={engine.speed}
        onToggleEditMode={() => setEditMode((prev) => !prev)}
        onStep={engine.step}
        onStepN={engine.stepN}
        onRun={engine.run}
        onStop={engine.stop}
        onSetSpeed={engine.setSpeed}
        onClear={engine.clear}
        onResetView={() => resetViewRef.current?.()}
      />

      <div className="flex flex-1 overflow-hidden">
        <GridCanvas
          liveCells={engine.liveCells}
          editMode={editMode}
          onCellToggle={engine.toggleCell}
          onCellSet={engine.setCell}
          onCursorMove={handleCursorMove}
          onResetViewReady={handleResetViewReady}
        />

        <PatternPanel
          samples={patterns.samples}
          userPatterns={patterns.userPatterns}
          loading={patterns.loading}
          onLoadPattern={patterns.loadPattern}
          onSavePattern={patterns.savePattern}
          onDeletePattern={patterns.deletePattern}
          getLiveCells={engine.getLiveCells}
          onPatternLoaded={engine.loadCells}
        />
      </div>

      <StatusBar
        generation={engine.generation}
        population={engine.population}
        cursorPos={cursorPos}
        popHistory={popHistory}
        popHistoryStartGen={popStartGen}
      />
    </div>
  );
}
