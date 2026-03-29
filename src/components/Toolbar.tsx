import { StepInput } from "./StepInput";

interface ToolbarProps {
  editMode: boolean;
  isRunning: boolean;
  speed: number;
  onToggleEditMode: () => void;
  onStep: () => void;
  onStepN: (n: number) => void;
  onRun: () => void;
  onStop: () => void;
  onSetSpeed: (ms: number) => void;
  onClear: () => void;
  onResetView: () => void;
}

export function Toolbar({
  editMode,
  isRunning,
  speed,
  onToggleEditMode,
  onStep,
  onStepN,
  onRun,
  onStop,
  onSetSpeed,
  onClear,
  onResetView,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-wrap">
      <button
        onClick={onToggleEditMode}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          editMode
            ? "bg-cyan-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        {editMode ? "Edit: ON" : "Edit: OFF"}
      </button>

      <div className="w-px h-6 bg-gray-700" />

      <button
        onClick={onStep}
        disabled={isRunning}
        className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Step
      </button>

      <StepInput onStepN={onStepN} disabled={isRunning} />

      <div className="w-px h-6 bg-gray-700" />

      {!isRunning ? (
        <button
          onClick={onRun}
          className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-700 text-emerald-100 hover:bg-emerald-600 transition-colors"
        >
          Run
        </button>
      ) : (
        <button
          onClick={onStop}
          className="px-3 py-1.5 rounded text-sm font-medium bg-red-700 text-red-100 hover:bg-red-600 transition-colors"
        >
          Stop
        </button>
      )}

      <div className="flex items-center gap-2 ml-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">
          Speed
        </label>
        <input
          type="range"
          min={20}
          max={1200}
          step={10}
          value={1220 - speed}
          onChange={(e) => onSetSpeed(1220 - Number(e.target.value))}
          className="w-24 accent-cyan-500"
        />
        <span className="text-xs text-gray-500 w-14 text-right">
          {speed}ms
        </span>
      </div>

      <div className="w-px h-6 bg-gray-700" />

      <button
        onClick={onClear}
        className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        Clear
      </button>

      <button
        onClick={onResetView}
        className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        Reset View
      </button>
    </div>
  );
}
