"use client";

import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import StatsBand from "@/components/landing/StatsBand";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import CanvasBackground from "@/components/landing/CanvasBackground";
import CustomCursor from "@/components/landing/CustomCursor";
import ChatWidget from "@/components/landing/ChatWidget";

import "./landing.css";

export default function Home() {
  useEffect(() => {
    // Scroll reveal observer
    const ob = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => ob.observe(el));

    return () => ob.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <CanvasBackground />
      <CustomCursor />
      
      <Header />
      <main>
        <Hero />
        <StatsBand />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />

      <ChatWidget />
    </div>
  );
}
