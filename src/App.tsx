import { useState, useRef, useCallback } from "react";
import { GridCanvas } from "./components/GridCanvas";
import { Toolbar } from "./components/Toolbar";
import { PatternPanel } from "./components/PatternPanel";
import { StatusBar } from "./components/StatusBar";
import { useGameEngine } from "./hooks/useGameEngine";
import { usePatterns } from "./hooks/usePatterns";

export function App() {
  const engine = useGameEngine();
  const patterns = usePatterns();
  const [editMode, setEditMode] = useState(false);
  const [cursorPos, setCursorPos] = useState<{
    col: number;
    row: number;
  } | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);

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
      />
    </div>
  );
}
