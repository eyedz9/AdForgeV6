"use client";

/**
 * Auth Layout
 *
 * Stunning authentication layout with holographic effects and animated background.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = 50;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          hue: Math.random() > 0.5 ? 270 : 190,
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(2, 2, 4, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${p.opacity})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 80%, 60%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Connect particles
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 50%, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-void)]">
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Grid pattern */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vw] orb orb-violet opacity-40 animate-aurora" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] orb orb-cyan opacity-30 animate-aurora" style={{ animationDelay: "-5s" }} />
      <div className="fixed top-[30%] left-[50%] w-[30vw] h-[30vw] orb orb-fuchsia opacity-20 animate-aurora" style={{ animationDelay: "-10s" }} />

      <div className="w-full max-w-md relative" style={{ zIndex: 10 }}>
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-down">
          <Link href="/" className="inline-block group">
            <div className="relative">
              <Image
                src="/logos/AdForge_logo_wht.png"
                alt="AdForge"
                width={180}
                height={48}
                className="mx-auto transition-all duration-300 group-hover:brightness-125"
                priority
              />
              <div className="absolute inset-0 blur-2xl bg-[var(--color-plasma-violet)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>
          <p className="text-sm text-[var(--color-text-muted)] mt-4 tracking-wide">
            Persona-First Advertising Platform
          </p>
        </div>

        {/* Auth card with gradient border */}
        <div className="gradient-border animate-scale-up">
          <div className="bg-[var(--color-surface)] rounded-[inherit] p-8 md:p-10 relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-plasma-violet)]/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 flex justify-center gap-4 animate-fade-up delay-4">
          <div className="w-8 h-1 rounded-full bg-[var(--color-plasma-violet)]/30" />
          <div className="w-8 h-1 rounded-full bg-[var(--color-plasma-cyan)]/30" />
          <div className="w-8 h-1 rounded-full bg-[var(--color-plasma-fuchsia)]/30" />
        </div>
      </div>
    </div>
  );
}
