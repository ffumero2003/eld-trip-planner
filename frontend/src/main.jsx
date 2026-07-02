import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "leaflet/dist/leaflet.css";
import VantaBackground from "./VantaBackground.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VantaBackground>
      <App />
    </VantaBackground>
  </StrictMode>,
);
