// src/components/Progress.jsx
import React from "react";

/**
 * Props:
 *  - steps: array of labels, e.g. ["Aadhaar", "PAN"]
 *  - current: 0-based index of current step
 *  - onSelect: (index) => void  (optional: clicking a step)
 */
export default function Progress({
  steps = [],
  current = 0,
  onSelect = () => {},
}) {
  const percent = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="ud-progress" aria-hidden={false}>
      <div className="ud-steps">
        {steps.map((label, i) => (
          <button
            key={i}
            type="button"
            className={`ud-step ${i === current ? "active" : ""} ${
              i < current ? "done" : ""
            }`}
            onClick={() => onSelect(i)}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="ud-step-circle">{i + 1}</span>
            <span className="ud-step-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="ud-progress-bar" aria-hidden="true">
        <div className="ud-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
