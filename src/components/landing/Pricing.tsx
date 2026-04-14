import Link from "next/link";

export default function Pricing() {
  return (
    <section id="pricing">
      <div className="section-label reveal" style={{ justifyContent: 'center' }}>Pricing</div>
      <h2 className="section-title reveal">Simple, Honest <em style={{ textTransform: 'uppercase' }}>Pricing.</em></h2>

      <div className="pricing-wrapper reveal">
        <div className="price-card interactive-cell">
          <div className="price-label">Starter</div>
          <div className="price-tag">FREE<span className="period"> / 14 days</span></div>
          <p className="price-desc">Everything you need to test the full pipeline at zero cost.</p>
          <ul className="feat-list">
            <li>50 AI calls per month</li>
            <li>5 Meta Ads accounts</li>
            <li>Basic lead scoring</li>
            <li>Email notifications</li>
            <li>Dashboard access</li>
          </ul>
          <Link href="/signup" className="btn-block btn-block-ghost">START FREE TRIAL</Link>
        </div>

        <div className="price-card featured interactive-cell">
          <div className="price-label">Pro</div>
          <div className="price-tag"><sup>$</sup>49<span className="period"> / month</span></div>
          <p className="price-desc">Full power for growing teams, agencies, and high-volume campaigns.</p>
          <ul className="feat-list">
            <li>Unlimited AI calls</li>
            <li>Multiple Meta accounts</li>
            <li>Advanced qualification logic</li>
            <li>Webhook integrations</li>
            <li>Priority support</li>
            <li>Custom AI scripts</li>
          </ul>
          <Link href="/signup" className="btn-block btn-block-cyan">GET STARTED &rarr;</Link>
        </div>
      </div>
    </section>
  );
}
