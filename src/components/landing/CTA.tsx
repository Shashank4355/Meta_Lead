import Link from "next/link";

export default function CTA() {
  return (
    <section id="cta-section">
      <div className="cta-glow"></div>
      <div className="cta-content reveal">
        <div className="cta-eyebrow">GET STARTED TODAY</div>
        <h2 className="cta-title" style={{ fontSize: '64px' }}>
          <span className="outline">SCALE YOUR</span><br />
          <span className="fill">LEAD PIPELINE.</span>
        </h2>
        <p className="cta-sub">
          No credit card required. Connect your Meta Ads and<br/>Vector Lead calls your first lead automatically.
        </p>
        <Link href="/signup" className="btn-primary btn-lg">SIGN UP FREE &rarr;</Link>
      </div>
    </section>
  );
}
