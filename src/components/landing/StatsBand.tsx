export default function StatsBand() {
  return (
    <section id="stats-band">
      <div className="stats-grid reveal">
        <div className="stat-item interactive-cell">
          <div className="stat-big">&lt;1<em>m</em></div>
          <div className="stat-desc">Time to Contact</div>
        </div>
        <div className="stat-item interactive-cell">
          <div className="stat-big">24<em>/</em>7</div>
          <div className="stat-desc">Uptime</div>
        </div>
        <div className="stat-item interactive-cell">
          <div className="stat-big">100<em>%</em></div>
          <div className="stat-desc">Lead Coverage</div>
        </div>
        <div className="stat-item interactive-cell">
          <div className="stat-big">CR<em>M</em></div>
          <div className="stat-desc">Auto-Sync</div>
        </div>
      </div>
    </section>
  );
}
