"use client";

import { useEffect, useRef } from "react";

class Particle {
  x!: number;
  y!: number;
  vx!: number;
  vy!: number;
  r!: number;
  a!: number;
  hue!: number;

  constructor(private w: number, private h: number) {
    this.reset();
  }
  
  reset() {
    this.x = Math.random() * this.w;
    this.y = Math.random() * this.h;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.25;
    this.r = Math.random() * 1.2 + 0.3;
    this.a = Math.random() * 0.3 + 0.05;
    this.hue = Math.random() > 0.85 ? 330 : 185; 
  }
  
  update(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > this.w) this.vx *= -1;
    if (this.y < 0 || this.y > this.h) this.vy *= -1;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue},100%,60%,${this.a})`;
    ctx.fill();
  }
}

export default function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    for (let i = 0; i < 100; i++) {
     particles.push(new Particle(w, h));
    }

    let reqId: number;

    const drawBg = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(w, h);
        particles[i].draw(ctx);
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,200,255,${(1 - d / 130) * 0.07})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      reqId = requestAnimationFrame(drawBg);
    };
    
    drawBg();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(reqId);
    };
  }, []);

  return <canvas id="bg-canvas" ref={canvasRef}></canvas>;
}
