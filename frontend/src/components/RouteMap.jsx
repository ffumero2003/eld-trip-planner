// src/RouteMap.jsx
// Draws the trip route + stop markers on an OpenStreetMap via Leaflet.

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import polyline from "@mapbox/polyline";
import L from "leaflet";

import { STOP_COLORS } from "../StopColors";

// A classic map pin as inline SVG so we can color it per stop.
function pinIcon(color) {
  return L.divIcon({
    className: "", // suppress Leaflet's default divIcon styling
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27C30 6.7 23.3 0 15 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="15" cy="15" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42], // tip of the pin sits on the coordinate
    popupAnchor: [0, -36],
  });
}

// Leaflet's default marker icons don't load correctly under bundlers like Vite,
// so we point them at the CDN copies explicitly. Without this, markers are invisible.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RouteMap({ routeGeometry, stops }) {
  // Decode each encoded polyline string into an array of [lat, lon] points.
  // polyline.decode returns [lat, lon] pairs, which is exactly what Leaflet wants.
  const decodedLegs = routeGeometry.map((geom) => polyline.decode(geom));

  // Center the map on the first stop (the current location).
  const center = stops.length ? [stops[0].lat, stops[0].lon] : [39.5, -98.35]; // fallback: middle of the US

  return (
    <div className="mt-6 h-[400px] overflow-hidden rounded-lg">
      <MapContainer center={center} zoom={5} className="h-full w-full">
        {/* The base map imagery from OpenStreetMap. */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* One Polyline per leg — the actual road path. */}
        {decodedLegs.map((leg, i) => (
          <Polyline key={i} positions={leg} color="#1a3d6d" weight={4} />
        ))}

        {/* A marker for each stop, with a popup label. */}
        {stops.map((stop, i) => (
          <Marker
            key={i}
            position={[stop.lat, stop.lon]}
            icon={pinIcon(STOP_COLORS[stop.label] || "#1a3d6d")}
          >
            <Popup>{stop.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
