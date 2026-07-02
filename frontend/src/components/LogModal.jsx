// src/components/LogsModal.jsx
// Fullscreen overlay showing the daily ELD log grids in a scrollable panel,
// so the results don't stretch the page downward.

import { useEffect } from "react";
import EldGrid from "./EldGrid";

export default function LogsModal({ days, onClose }) {
  // Close on Escape.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock the page scroll behind the modal while it's open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    // Backdrop — clicking it closes the modal.
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 rounded-2xl p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — stopPropagation so clicks inside don't close it. */}
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-navy shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stays fixed while the body scrolls. */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Daily ELD Logs ({days.length} {days.length === 1 ? "day" : "days"})
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body: vertical scroll here; each grid keeps its own
            horizontal scroll from EldGrid's overflow-x-auto wrapper. */}
        <div className="overflow-y-auto px-6 pb-6">
          {days.map((day, i) => (
            <EldGrid key={i} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}
