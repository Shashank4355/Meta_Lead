const stats = [
  { value: "2,400+", label: "Leads Called" },
  { value: "98%", label: "Answer Rate" },
  { value: "< 60s", label: "Avg Response" },
  { value: "3×", label: "Conversion Lift" },
];

export default function TrustStrip() {
  return (
    <section className="border-grid-b" style={{ backgroundColor: "var(--bg-alt)" }}>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`p-6 md:p-8 text-center interactive-cell ${i < stats.length - 1 ? "border-grid-r" : ""} ${i < 2 ? "border-grid-b md:border-b-0" : ""}`}
          >
            <span
              className="block text-3xl md:text-4xl mb-2 tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--success)" }}
            >
              {stat.value}
            </span>
            <span className="label-mono">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
