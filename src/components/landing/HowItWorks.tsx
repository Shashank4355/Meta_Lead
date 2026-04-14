export default function HowItWorks() {
  return (
    <section id="how">
      <div className="section-label reveal">Architecture</div>
      <h2 className="section-title reveal">Autonomous <em>Lead</em> Pipeline</h2>

      <div className="steps-grid reveal">
        <div className="step-card">
          <div className="step-num">01</div>
          <div className="step-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3 className="step-title">Ingest</h3>
          <p className="step-desc">Webhooks attach directly to your Meta Lead Forms. Data is parsed and verified in milliseconds, triggering the execution protocol.</p>
        </div>

        <div className="step-card">
          <div className="step-num">02</div>
          <div className="step-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20"></path>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3 className="step-title">Process</h3>
          <p className="step-desc">Vector AI dials the lead instantly. It conducts a human-like, dynamic conversation to qualify intent and extract crucial data points.</p>
        </div>

        <div className="step-card">
          <div className="step-num">03</div>
          <div className="step-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 className="step-title">Deploy</h3>
          <p className="step-desc">A complete structured summary and call recording is routed to your CRM. Hot leads are instantly transferred to your sales representatives.</p>
        </div>
      </div>
    </section>
  );
}
