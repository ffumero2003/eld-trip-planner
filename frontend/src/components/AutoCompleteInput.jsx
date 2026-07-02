// src/components/AutoCompleteInput.jsx
// A text input that shows live address suggestions from OpenStreetMap's
// Nominatim geocoder. Debounced so we don't spam the API on every keystroke.

import { useState, useEffect, useRef } from "react";
import { INPUT_CLASSES, LABEL_CLASSES } from "../App";

// Photon: free OSM-based geocoder built for search-as-you-type.
const PHOTON_URL = "https://photon.komoot.io/api/";

// Full state names -> USPS abbreviations, so "California" becomes "CA".
const US_STATE_ABBR = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

// Build a short "Los Angeles, CA" label from Nominatim's structured address.
// Falls back to the full display_name if we can't figure out a short one.
// Short "Los Angeles, CA" label from a Photon feature.
function shortLabel(f) {
  const p = f.properties;
  const place = p.name || p.city || p.county;
  const state = US_STATE_ABBR[p.state] || p.state;
  return state ? `${place}, ${state}` : place;
}

// Longer context line shown under the short label.
function longLabel(f) {
  const p = f.properties;
  return [p.name, p.city, p.county, p.state, p.country]
    .filter(Boolean)
    .join(", ");
}

export default function AutocompleteInput({
  label,
  placeholder,
  value,
  onChange,
  dotColor,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef(null);
  const skipFetchRef = useRef(false);
  // Set to 1 for suggestions from the very first letter, 2 to wait for two, etc.
  const MIN_CHARS = 1;

  // Fetch suggestions whenever `value` changes, but debounced (350ms).
  useEffect(() => {
    // A suggestion was just picked — this value change is not the user typing,
    // so don't fetch (it would reopen the dropdown).
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          limit: "10", // over-fetch, then filter to US + dedupe down to 5
          lang: "en",
        });
        const res = await fetch(`${PHOTON_URL}?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        // US only, dedupe identical labels (Photon often returns city + county + district).
        const seen = new Set();
        const results = data.features
          .filter((f) => f.properties.countrycode === "US")
          .filter((f) => {
            const label = shortLabel(f);
            if (seen.has(label)) return false;
            seen.add(label);
            return true;
          })
          .slice(0, 5);

        setSuggestions(results);
        setOpen(true);
        setHighlight(-1);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(s) {
    skipFetchRef.current = true;
    onChange(shortLabel(s));
    setSuggestions([]);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className={`peer ${INPUT_CLASSES} ${dotColor ? "pr-9" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {label && <label className={LABEL_CLASSES}>{label}</label>}
      {dotColor && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white/40"
          style={{ backgroundColor: dotColor }}
        />
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/15 bg-navy shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              onMouseDown={() => pick(s)} // mouseDown fires before input blur
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 ${
                i === highlight ? "bg-white/10" : ""
              }`}
            >
              <div className="truncate text-sm text-white/90">
                {shortLabel(s)}
              </div>
              <div className="truncate text-xs text-white/40">
                {longLabel(s)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
