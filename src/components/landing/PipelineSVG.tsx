export default function PipelineSVG() {
  return (
    <svg
      viewBox="0 0 480 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-label="Pipeline diagram showing lead flow: Meta Lead to AI Voice Call to Qualified"
      role="img"
    >
      {/* Connection lines */}
      <line
        x1="150" y1="100"
        x2="195" y2="100"
        stroke="var(--accent)"
        strokeWidth="1.5"
        className="pipeline-line"
      />
      <line
        x1="315" y1="100"
        x2="360" y2="100"
        stroke="var(--accent)"
        strokeWidth="1.5"
        className="pipeline-line"
      />

      {/* Pulsing dots on lines */}
      <circle cx="172" cy="100" r="4" fill="var(--accent)" className="pipeline-dot" />
      <circle cx="337" cy="100" r="4" fill="var(--accent)" className="pipeline-dot" style={{ animationDelay: "1s" }} />

      {/* Node 1: META LEAD */}
      <g className="pipeline-node svg-interactive-node">
        <rect x="20" y="65" width="130" height="70" fill="none" stroke="var(--grid)" strokeWidth="1" />
        <rect x="20" y="65" width="130" height="24" fill="var(--bg-alt)" stroke="var(--grid)" strokeWidth="1" />
        <text x="85" y="81" textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, fill: "var(--fg-muted)" }}>
          01 — INPUT
        </text>
        <text x="85" y="108" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, fill: "var(--fg)" }}>
          META LEAD
        </text>
      </g>

      {/* Node 2: AI VOICE CALL */}
      <g className="pipeline-node svg-interactive-node">
        <rect x="195" y="65" width="120" height="70" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="195" y="65" width="120" height="24" fill="var(--accent)" />
        <text x="255" y="81" textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, fill: "#ffffff" }}>
          02 — PROCESS
        </text>
        <text x="255" y="108" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, fill: "var(--fg)" }}>
          AI VOICE CALL
        </text>
      </g>

      {/* Node 3: QUALIFIED */}
      <g className="pipeline-node svg-interactive-node">
        <rect x="360" y="65" width="100" height="70" fill="none" stroke="var(--success)" strokeWidth="1.5" />
        <rect x="360" y="65" width="100" height="24" fill="var(--success)" />
        <text x="410" y="81" textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, fill: "#ffffff" }}>
          03 — OUTPUT
        </text>
        <text x="410" y="108" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, fill: "var(--fg)" }}>
          QUALIFIED ✓
        </text>
      </g>

      {/* Flow arrows */}
      <polygon points="193,96 193,104 200,100" fill="var(--accent)" />
      <polygon points="358,96 358,104 365,100" fill="var(--success)" />
    </svg>
  );
}
