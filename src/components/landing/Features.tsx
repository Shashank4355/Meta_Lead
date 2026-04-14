const features = [
  {
    index: "01",
    title: "Connect",
    description:
      "Link your Meta Ads account in one click. We sync with your lead forms and start listening for new submissions in real time.",
  },
  {
    index: "02",
    title: "Call",
    description:
      "When a lead comes in, our AI voice agent calls them within 60 seconds. Natural conversation, not a robocall. They won't know it's AI.",
  },
  {
    index: "03",
    title: "Qualify",
    description:
      "Each lead is scored based on the conversation. Hot leads get flagged. Cold leads get filtered. Results appear in your dashboard instantly.",
  },
];

export default function Features() {
  return (
    <section id="how-it-works" className="border-grid-b">
      <div className="px-8 md:px-12 py-6 border-grid-b">
        <p className="label-mono">How It Works</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        {features.map((feature, i) => (
          <div
            key={feature.index}
            className={`p-8 md:p-10 interactive-cell ${i < features.length - 1 ? "md:border-grid-r" : ""} ${i < features.length - 1 ? "border-grid-b md:border-b-0" : ""}`}
          >
            <span
              className="inline-block px-3 py-1 mb-6 rounded-full"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--accent)",
                backgroundColor: "var(--accent-ghost)",
              }}
            >
              Step {feature.index}
            </span>

            <h3
              className="text-2xl mb-4"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fg-h1)" }}
            >
              {feature.title}
            </h3>

            <p
              className="leading-relaxed"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--fg)",
                fontSize: "15px",
              }}
            >
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
