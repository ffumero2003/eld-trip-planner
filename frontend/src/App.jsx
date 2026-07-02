// src/App.jsx
// Trip form -> POST to Django -> map + ELD log grids.

import { useState } from "react";
import axios from "axios";
import RouteMap from "./components/RouteMap";
import AutocompleteInput from "./components/AutoCompleteInput";
import { STOP_COLORS } from "./StopColors";
import LogsModal from "./components/LogModal";

// Backend base URL: Render in production, localhost in dev.
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const API_URL = `${API_BASE}/api/plan/`;
const EXPLAIN_URL = `${API_BASE}/api/explain/`;

// Shared look for all form inputs (also used inside AutocompleteInput).
export const INPUT_CLASSES =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint";

// Label that sits on the input's top border, "cutting" the line.
// Solid navy background masks the border underneath to create the notch.
export const LABEL_CLASSES =
  "pointer-events-none absolute -top-2 left-3 z-10 rounded bg-navy px-1 text-xs font-medium text-white/60 peer-focus:text-mint";

function App() {
  // Form field state — one piece of state per input.
  const [current, setCurrent] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [cycleHours, setCycleHours] = useState("");
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [stops, setStops] = useState(null);

  //Claude Hooks
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  //Modal
  const [showLogs, setShowLogs] = useState(false);

  // Response + UI state.
  const [days, setDays] = useState(null); // the backend's days array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Called when the user clicks Plan Trip.
  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setDays(null);
    setExplanation(null);

    try {
      const response = await axios.post(API_URL, {
        current_location: current,
        pickup_location: pickup,
        dropoff_location: dropoff,
        current_cycle_hours: parseFloat(cycleHours) || 0,
      });

      if (response.data.status === "ok") {
        setDays(response.data.days);
        setRouteGeometry(response.data.route_geometry);
        setStops(response.data.stops);
      } else {
        // Backend returned a clean error (bad address, etc.)
        setError(response.data.message || "Something went wrong");
      }
    } catch (err) {
      // Network failure or a non-2xx status from the backend.
      const msg = err.response?.data?.message || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain() {
    setExplaining(true);
    try {
      const response = await axios.post(EXPLAIN_URL, { days, stops });
      setExplanation(response.data.explanation);
    } catch (err) {
      setExplanation("Sorry, the AI explanation failed. Try again.");
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 font-sans">
      {/* Translucent card so content stays readable over the Vanta globe. */}
      <div className="rounded-2xl bg-navy/75 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          ELD Trip Planner
        </h1>

        <div className="flex flex-col gap-5">
          <AutocompleteInput
            label="Current location"
            placeholder="e.g. Los Angeles, CA"
            value={current}
            onChange={setCurrent}
            dotColor={STOP_COLORS.Current}
          />
          <AutocompleteInput
            label="Pickup location"
            placeholder="e.g. Phoenix, AZ"
            value={pickup}
            onChange={setPickup}
            dotColor={STOP_COLORS.Pickup}
          />
          <AutocompleteInput
            label="Dropoff location"
            placeholder="e.g. Dallas, TX"
            value={dropoff}
            onChange={setDropoff}
            dotColor={STOP_COLORS.Dropoff}
          />
          <div className="relative">
            <input
              className={`peer ${INPUT_CLASSES}`}
              placeholder="0 – 70"
              value={cycleHours}
              onChange={(e) => setCycleHours(e.target.value)}
            />
            <label className={LABEL_CLASSES}>Current cycle hours used</label>
          </div>
          <button
            className="mt-2 rounded-lg bg-coral px-4 py-2 font-semibold text-white transition hover:bg-coral/85 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Planning..." : "Plan Trip"}
          </button>
        </div>

        {error && <p className="mt-5 text-coral">Error: {error}</p>}

        {routeGeometry && stops && (
          <RouteMap routeGeometry={routeGeometry} stops={stops} />
        )}

        {days && (
          <button
            className="mt-6 w-full rounded-lg border border-mint/40 bg-teal/30 px-4 py-2 font-semibold text-mint transition hover:bg-teal/50"
            onClick={() => setShowLogs(true)}
          >
            View Daily Logs ({days.length} {days.length === 1 ? "day" : "days"})
          </button>
        )}

        {days && (
          <button
            className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleExplain}
            disabled={explaining}
          >
            {explaining ? "Thinking..." : " Explain this trip with AI"}
          </button>
        )}

        {explanation && (
          <div className="mt-4 rounded-lg border border-mint/30 bg-teal/20 p-4 text-sm leading-relaxed text-white/90 whitespace-pre-line">
            {explanation}
          </div>
        )}

        {showLogs && days && (
          <LogsModal days={days} onClose={() => setShowLogs(false)} />
        )}
      </div>
    </div>
  );
}

export default App;
