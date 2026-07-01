// src/EldGrid.jsx
// Renders one FMCSA daily log grid for a single day's segments as SVG.
// Each segment is a horizontal line on its status row; status changes get
// a vertical connector — the classic duty-status line.

// The four rows, top to bottom, matching the FMCSA log order.
const ROWS = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];

// Human labels for the row headers.
const ROW_LABELS = {
  off_duty: "Off Duty",
  sleeper_berth: "Sleeper Berth",
  driving: "Driving",
  on_duty_not_driving: "On Duty",
};

// Layout constants (in SVG user units).
const LEFT_MARGIN = 110; // space for row labels on the left
const RIGHT_MARGIN = 20;
const TOP_MARGIN = 30; // space for the hour numbers on top
const ROW_HEIGHT = 40;
const GRID_WIDTH = 720; // the 24-hour drawable area width
const TOTAL_WIDTH = LEFT_MARGIN + GRID_WIDTH + RIGHT_MARGIN;
const TOTAL_HEIGHT = TOP_MARGIN + ROWS.length * ROW_HEIGHT + 20;

// Convert a minute (0..1440) to an X coordinate.
function minuteToX(minute) {
  return LEFT_MARGIN + (minute / 1440) * GRID_WIDTH;
}

// The vertical center of a given status row.
function statusToY(status) {
  const index = ROWS.indexOf(status);
  return TOP_MARGIN + index * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export default function EldGrid({ day }) {
  // Build the line points: for each segment, a horizontal run on its row.
  // Between consecutive segments we also draw a vertical connector.
  const lines = [];

  day.segments.forEach((seg, i) => {
    const y = statusToY(seg.status);
    const x1 = minuteToX(seg.start_minute);
    const x2 = minuteToX(seg.end_minute);

    // Horizontal line for this segment.
    lines.push(
      <line
        key={`h-${i}`}
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke="#1a3d6d"
        strokeWidth="2"
      />,
    );

    // Vertical connector to the next segment (if any), drawn at the boundary.
    const next = day.segments[i + 1];
    if (next) {
      const yNext = statusToY(next.status);
      lines.push(
        <line
          key={`v-${i}`}
          x1={x2}
          y1={y}
          x2={x2}
          y2={yNext}
          stroke="#1a3d6d"
          strokeWidth="2"
        />,
      );
    }
  });

  // Hour tick labels across the top (0, 3, 6, ... 24 to keep it readable).
  const hourTicks = [];
  for (let h = 0; h <= 24; h += 1) {
    const x = minuteToX(h * 60);
    // Light vertical gridline for every hour.
    hourTicks.push(
      <line
        key={`tick-${h}`}
        x1={x}
        y1={TOP_MARGIN}
        x2={x}
        y2={TOP_MARGIN + ROWS.length * ROW_HEIGHT}
        stroke="#ddd"
        strokeWidth="1"
      />,
    );
    // Number label every 3 hours to avoid clutter.
    if (h % 3 === 0) {
      hourTicks.push(
        <text
          key={`lbl-${h}`}
          x={x}
          y={TOP_MARGIN - 8}
          fontSize="10"
          textAnchor="middle"
          fill="#555"
        >
          {h === 0 ? "Mid" : h === 24 ? "Mid" : h}
        </text>,
      );
    }
  }

  // Row separator lines + labels.
  const rowGuides = ROWS.map((status, i) => {
    const yTop = TOP_MARGIN + i * ROW_HEIGHT;
    return (
      <g key={`row-${status}`}>
        <line
          x1={LEFT_MARGIN}
          y1={yTop}
          x2={LEFT_MARGIN + GRID_WIDTH}
          y2={yTop}
          stroke="#bbb"
          strokeWidth="1"
        />
        <text
          x={LEFT_MARGIN - 10}
          y={yTop + ROW_HEIGHT / 2 + 4}
          fontSize="11"
          textAnchor="end"
          fill="#333"
        >
          {ROW_LABELS[status]}
        </text>
      </g>
    );
  });

  // Bottom border of the last row.
  const bottomLine = (
    <line
      x1={LEFT_MARGIN}
      y1={TOP_MARGIN + ROWS.length * ROW_HEIGHT}
      x2={LEFT_MARGIN + GRID_WIDTH}
      y2={TOP_MARGIN + ROWS.length * ROW_HEIGHT}
      stroke="#bbb"
      strokeWidth="1"
    />
  );

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ margin: "0 0 6px" }}>{day.date}</h3>
      <svg
        width={TOTAL_WIDTH}
        height={TOTAL_HEIGHT}
        style={{ border: "1px solid #eee", background: "#fff" }}
      >
        {hourTicks}
        {rowGuides}
        {bottomLine}
        {lines}
      </svg>
    </div>
  );
}
