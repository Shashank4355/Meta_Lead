"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const multiplier = 0.04;
      const rotateX = -y * multiplier;
      const rotateY = x * multiplier;
      
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = `rotateX(0deg) rotateY(0deg)`;
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <section id="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-badge reveal" style={{ borderRadius: '40px', border: '1px solid rgba(0,200,255,0.15)', clipPath: 'none', padding: '8px 20px', background: 'rgba(0,15,30,0.6)' }}>
            <div className="dot"></div>
            <span style={{color: 'var(--cyan)'}}>AI-POWERED LEAD AUTOMATION</span>
          </div>
          <h1 className="reveal">
            <span className="solid">SCALE</span><br/>
            <span className="accent">YOUR</span><br/>
            <span className="solid">PIPELINE.</span>
          </h1>
          <p className="hero-sub reveal">
            Connect your Meta Ads account. Our AI calls every new lead instantly, qualifies them with natural conversation, and delivers scored results to your dashboard.
          </p>
          <div className="hero-ctas reveal">
            <Link href="/signup" className="btn-primary btn-lg">START FREE &rarr;</Link>
            <a href="#how" className="btn-ghost btn-lg" style={{border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff'}}>SEE HOW IT WORKS</a>
          </div>
          <div className="hero-note reveal">No credit card required &middot; Live in 60 seconds</div>
        </div>
        
        <div className="hero-visual reveal">
          <div className="card-3d-wrapper">
            <div className="dashboard-card tilt-card" ref={cardRef}>
              <div className="scanline"></div>
              
              <div className="dc-header">
                <div className="dc-title">LEAD ACTIVITY</div>
                <div className="live-badge">
                  <div className="live-dot"></div>
                  LIVE FEED
                </div>
              </div>

              <div className="wave-section">
                <div className="wave-label">AI VOICE &mdash; ACTIVE CALL</div>
                <div className="wave-row">
                  {[...Array(60)].map((_, i) => (
                    <div 
                      key={i} 
                      className="wave-bar" 
                      style={{ animationDelay: `${i * -0.1}s` }}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="lead-list">
                <div className="lead-item">
                  <div className="lead-avatar" style={{ background: 'rgba(0,200,255,0.1)', color: 'var(--cyan)' }}>AM</div>
                  <div className="lead-info">
                    <div className="lead-name">Arjun Mehta</div>
                    <div className="lead-meta">Mumbai &middot; 12s ago</div>
                  </div>
                  <div className="lead-status s-calling" style={{textTransform:'uppercase'}}>CALLING</div>
                </div>
                <div className="lead-item">
                  <div className="lead-avatar" style={{ background: 'rgba(0,255,176,0.1)', color: 'var(--mint)' }}>PS</div>
                  <div className="lead-info">
                    <div className="lead-name">Priya Sharma</div>
                    <div className="lead-meta">Delhi &middot; 4m ago</div>
                  </div>
                  <div className="lead-status s-qualified" style={{textTransform:'uppercase'}}>QUALIFIED</div>
                </div>
                <div className="lead-item">
                  <div className="lead-avatar" style={{ background: 'rgba(80,128,160,0.1)', color: '#DCF0FF' }}>RK</div>
                  <div className="lead-info">
                    <div className="lead-name">Rahul Kumar</div>
                    <div className="lead-meta">Bangalore &middot; 9m ago</div>
                  </div>
                  <div className="lead-status s-new" style={{textTransform:'uppercase', background: 'rgba(80,128,160,0.1)', color: 'var(--muted)', border: 'none'}}>PENDING</div>
                </div>
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-num">98<span style={{fontSize: '14px', verticalAlign: 'middle', marginLeft: '2px', color: 'var(--cyan)'}}>%</span></div>
                  <div className="stat-lbl" style={{textTransform:'uppercase'}}>Answer Rate</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center'}}><span style={{color: '#fff', fontSize: '18px', marginRight: '2px'}}>&lt;</span>60<span style={{fontSize: '14px', verticalAlign: 'middle', marginLeft: '2px', color: 'var(--cyan)'}}>S</span></div>
                  <div className="stat-lbl" style={{textTransform:'uppercase'}}>Response</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">3<span style={{fontSize: '14px', verticalAlign: 'middle', marginLeft: '2px', color: 'var(--cyan)'}}>x</span></div>
                  <div className="stat-lbl" style={{textTransform:'uppercase'}}>Conversion</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
