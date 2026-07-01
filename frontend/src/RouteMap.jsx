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
    <div
      style={{
        height: 400,
        marginTop: 24,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
      >
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
          <Marker key={i} position={[stop.lat, stop.lon]} icon={defaultIcon}>
            <Popup>{stop.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
