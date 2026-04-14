"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let req: number;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx + "px";
      cursor.style.top = my + "px";
    };

    const animRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      req = requestAnimationFrame(animRing);
    };

    document.addEventListener("mousemove", onMouseMove);
    req = requestAnimationFrame(animRing);

    const onEnter = () => {
      cursor.style.width = '18px';
      cursor.style.height = '18px';
      ring.style.width = '52px';
      ring.style.height = '52px';
    };
    
    const onLeave = () => {
      cursor.style.width = '10px';
      cursor.style.height = '10px';
      ring.style.width = '34px';
      ring.style.height = '34px';
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('button, a, .tilt-card, .lead-item') || target.closest('button, a, .tilt-card, .lead-item')) {
        onEnter();
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('button, a, .tilt-card, .lead-item') || target.closest('button, a, .tilt-card, .lead-item')) {
        onLeave();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(req);
    };
  }, []);

  return (
    <>
      <div id="cursor" ref={cursorRef}></div>
      <div id="cursor-ring" ref={ringRef}></div>
    </>
  );
}
