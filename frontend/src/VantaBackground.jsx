// src/VantaBackground.jsx
// Full-page animated Vanta GLOBE background in Spotter brand colors.
// Renders behind everything; children are your normal app content.

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import GLOBE from "vanta/src/vanta.globe";

// Spotter Labs brand colors (from the logo)
const NAVY = 0x0f1c2e; // logo background
const CORAL = 0xfb4d5c; // red dot
const MINT = 0xa9cfc9; // light teal dots

export default function VantaBackground({ children }) {
  const [vantaEffect, setVantaEffect] = useState(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        GLOBE({
          el: vantaRef.current,
          THREE, // pass three.js explicitly — required when bundling
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: NAVY,
          color: CORAL, // main globe wireframe
          color2: MINT, // dots / secondary lines
          size: 1.0,
        }),
      );
    }
    // Destroy the WebGL context on unmount so it doesn't leak.
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return (
    <div className="relative">
      {/* Fixed full-viewport background — content scrolls over it,
        so it never needs to grow with the page. */}
      <div ref={vantaRef} className="fixed inset-0 -z-10" />
      <div className="relative min-h-screen">{children}</div>
    </div>
  );
}
