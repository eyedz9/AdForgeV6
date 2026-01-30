"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {value}{suffix}
    </div>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Interactive particle system
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

    const mouse = { x: 0, y: 0 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 1.5;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.6 + 0.1,
          hue: Math.random() > 0.5 ? 270 : 190, // violet or cyan
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(2, 2, 4, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Mouse interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.vx -= (dx / dist) * force * 0.02;
          p.vy -= (dy / dist) * force * 0.02;
        }

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Apply friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Boundary check
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${p.opacity})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.opacity})`;
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = 0.15 * (1 - dist / 100);
            ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 60%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Track mouse for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    {
      title: "AI Persona Engine",
      description: "Generate hyper-specific consumer personas with 50+ attributes including demographics, psychographics, and behavioral patterns.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="1" fill="currentColor"/>
        </svg>
      ),
      color: "violet",
      size: "large",
    },
    {
      title: "Market Intelligence",
      description: "Real-time competitor analysis, trend detection, and industry insights automatically synthesized.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
      ),
      color: "cyan",
      size: "medium",
    },
    {
      title: "Creative Generation",
      description: "AI-powered image and video creation tailored to each persona's preferences.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      ),
      color: "fuchsia",
      size: "medium",
    },
    {
      title: "Multi-Platform Export",
      description: "One-click deployment to Meta, Google, TikTok, LinkedIn, Pinterest & Snapchat.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16,6 12,2 8,6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      ),
      color: "emerald",
      size: "medium",
    },
  ];

  const stats = [
    { value: "6", label: "Ad Platforms" },
    { value: "50+", label: "Persona Attributes" },
    { value: "<60", suffix: "s", label: "Generation Time" },
    { value: "10x", label: "Faster Campaigns" },
  ];

  const platforms = ["Meta", "Google", "TikTok", "LinkedIn", "Pinterest", "Snapchat"];

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-[150vh] pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Aurora gradient orbs */}
      <div
        className="fixed top-[-20%] right-[-10%] w-[60vw] h-[60vw] orb orb-violet animate-aurora opacity-60"
        style={{
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
        }}
      />
      <div
        className="fixed bottom-[-30%] left-[-20%] w-[70vw] h-[70vw] orb orb-cyan animate-aurora opacity-40"
        style={{
          animationDelay: "-5s",
          transform: `translate(${mousePosition.x * -0.3}px, ${mousePosition.y * -0.3}px)`,
        }}
      />
      <div
        className="fixed top-[40%] left-[60%] w-[40vw] h-[40vw] orb orb-fuchsia animate-aurora opacity-30"
        style={{
          animationDelay: "-10s",
          transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`,
        }}
      />

      {/* Grid overlay */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 animate-fade-down">
        <div className="glass-strong border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="relative group">
              <Image
                src="/logos/AdForge_logo_wht.png"
                alt="AdForge"
                width={140}
                height={38}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 blur-xl bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-5 py-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium transition-colors duration-200"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="relative group px-6 py-2.5 bg-white text-[var(--color-void)] rounded-full font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20" style={{ zIndex: 2 }}>
        {/* Floating badge */}
        <div className="animate-fade-up delay-1 mb-8">
          <div className="inline-flex items-center gap-3 px-2 py-1.5 rounded-full glass border border-purple-500/30">
            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full text-xs font-bold uppercase tracking-wider">
              New
            </span>
            <span className="text-purple-300 text-sm font-medium pr-3">
              AI-Powered Persona Generation
            </span>
          </div>
        </div>

        {/* Main headline */}
        <h1 className="animate-fade-up delay-2 text-center max-w-5xl mb-8">
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.9]">
            Transform Data Into
          </span>
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.9] mt-2 text-gradient">
            Unforgettable Ads
          </span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-3 text-xl sm:text-2xl text-[var(--color-text-secondary)] text-center max-w-2xl mb-12 leading-relaxed">
          AdForge synthesizes market intelligence into hyper-specific consumer personas,
          then generates targeted creatives for every major ad platform.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up delay-4 flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 rounded-full font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] animate-pulse-glow"
          >
            <span>Start Free Trial</span>
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg border border-white/20 transition-all duration-300 hover:bg-white/5 hover:border-white/40"
          >
            <span>See How It Works</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fade-up delay-5 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 pt-8 border-t border-white/10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in delay-8">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="mb-20">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-purple-400 mb-4 animate-fade-up">
              Capabilities
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.1] animate-fade-up delay-1">
              Everything you need to
              <span className="text-gradient-static"> dominate</span> paid media
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            {/* Large feature card */}
            <div className="col-span-12 md:col-span-7 holo-card p-8 md:p-10 animate-scale-up delay-2">
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                  {features[0].icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                  {features[0].title}
                </h3>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-lg">
                  {features[0].description}
                </p>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 right-6 opacity-10">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                  <circle cx="12" cy="8" r="5"/>
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                </svg>
              </div>
            </div>

            {/* Medium feature card */}
            <div className="col-span-12 md:col-span-5 holo-card p-8 animate-scale-up delay-3">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-5 text-cyan-400">
                {features[1].icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{features[1].title}</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {features[1].description}
              </p>
            </div>

            {/* Row 2 */}
            {features.slice(2).map((feature, i) => (
              <div
                key={feature.title}
                className={`col-span-12 sm:col-span-6 md:col-span-4 holo-card p-6 md:p-8 animate-scale-up delay-${4 + i}`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    feature.color === "fuchsia"
                      ? "bg-fuchsia-500/20 text-fuchsia-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}

            {/* Workflow preview card */}
            <div className="col-span-12 md:col-span-4 holo-card p-6 md:p-8 animate-scale-up delay-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Smart Automation</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Automated workflows that optimize your campaigns in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="relative py-24 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-8">
            Export to all major platforms
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {platforms.map((platform, i) => (
              <div
                key={platform}
                className="text-2xl md:text-3xl font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all duration-300 hover:scale-110 cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-4xl mx-auto">
          <div className="relative gradient-border overflow-hidden">
            <div className="relative bg-gradient-to-br from-[var(--color-elevated)] to-[var(--color-surface)] rounded-[inherit] p-12 md:p-16 text-center">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/5 to-purple-500/10 pointer-events-none" />

              <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                Ready to forge
                <span className="text-gradient"> better ads</span>?
              </h2>
              <p className="relative text-xl text-[var(--color-text-secondary)] mb-10 max-w-xl mx-auto">
                Start your free trial today. No credit card required.
              </p>
              <Link
                href="/signup"
                className="relative inline-flex items-center gap-3 px-10 py-5 bg-white text-[var(--color-void)] rounded-full font-bold text-lg transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105"
              >
                <span>Get Started Free</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logos/AdForge_logo_wht.png"
              alt="AdForge"
              width={120}
              height={32}
              className="object-contain"
            />
          </Link>

          <div className="flex gap-8">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {link}
              </a>
            ))}
          </div>

          <p className="text-sm text-[var(--color-text-muted)]">
            © 2026 AdForge. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
