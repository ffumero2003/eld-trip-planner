// src/App.jsx
// Step 1: trip form -> POST to Django -> show raw JSON.
// Proves the frontend talks to the backend before we add map + grid.

import { useState } from "react";
import axios from "axios";
import EldGrid from "./EldGrid";
import RouteMap from "./RouteMap";

// Where the Django backend lives in dev.
const API_URL = "http://127.0.0.1:8000/api/plan/";

function App() {
  // Form field state — one piece of state per input.
  const [current, setCurrent] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [cycleHours, setCycleHours] = useState("");
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [stops, setStops] = useState(null);

  // Response + UI state.
  const [days, setDays] = useState(null); // the backend's days array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Called when the user clicks Plan Trip.
  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setDays(null);

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

  return (
    <div
      style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h1>ELD Trip Planner</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          placeholder="Current location"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          placeholder="Pickup location"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
        />
        <input
          placeholder="Dropoff location"
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
        />
        <input
          placeholder="Current cycle hours used"
          value={cycleHours}
          onChange={(e) => setCycleHours(e.target.value)}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Planning..." : "Plan Trip"}
        </button>
      </div>

      {error && <p style={{ color: "red", marginTop: 20 }}>Error: {error}</p>}

      {routeGeometry && stops && (
        <RouteMap routeGeometry={routeGeometry} stops={stops} />
      )}

      {days && (
        <div>
          {days.map((day, i) => (
            <EldGrid key={i} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
