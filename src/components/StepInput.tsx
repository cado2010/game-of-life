import { useState } from "react";

interface StepInputProps {
  onStepN: (n: number) => void;
  disabled: boolean;
}

export function StepInput({ onStepN, disabled }: StepInputProps) {
  const [value, setValue] = useState("10");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      onStepN(n);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={100000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="w-20 px-2 py-1.5 rounded text-sm bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
        placeholder="N"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Step N
      </button>
    </form>
  );
}
