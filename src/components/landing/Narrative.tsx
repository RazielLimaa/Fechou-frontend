"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

const VIDEO_SRC = "/videos/contract-calm.mp4";
const FRAME_RADIUS = "24px";

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

// ─── Dimensões FINAIS do vídeo ───────────────────────────────────────────────
function getVideoFrame() {
  if (isMobileViewport()) {
    return {
      width: "min(calc(100vw - 24px), 430px)",
      height: "clamp(430px, 84dvh, 720px)",
      borderRadius: FRAME_RADIUS,
    };
  }
  return {
    width: "min(78vw, 1180px)",
    height: "clamp(300px, 34vw, 500px)",
    borderRadius: FRAME_RADIUS,
  };
}

// ─── Decoração: sempre ligeiramente MAIOR que o vídeo ────────────────────────
// Mantém uma borda visual ao redor em qualquer viewport.
const DECOR_PADDING_X = 38; // px extra de cada lado (horizontal)
const DECOR_PADDING_Y = 32; // px extra de cada lado (vertical)

function getDecorFrame() {
  if (isMobileViewport()) {
    // Calcula a partir do vídeo final no mobile
    const vw = window.innerWidth;
    const videoW = Math.min(vw - 24, 430);
    const videoH = Math.min(Math.max(430, window.innerHeight * 0.84), 720);
    return {
      width: `${videoW + 34}px`,
      height: `${videoH + 34}px`,
    };
  }
  const vw = window.innerWidth;
  const videoW = Math.min(vw * 0.78, 1180);
  const videoH = Math.min(Math.max(300, vw * 0.34), 500);
  return {
    width: `${videoW + DECOR_PADDING_X * 2}px`,
    height: `${videoH + DECOR_PADDING_Y * 2}px`,
  };
}

// ─── Dimensões INICIAIS (círculo) ─────────────────────────────────────────────
function getInitialCircleSize() {
  if (isMobileViewport()) return "clamp(120px, 26vw, 160px)";
  return "clamp(140px, 12vw, 180px)";
}

export default function SecondOrangeImpactSection() {
  const { t, i18n } = useTranslation();
  const sectionRef    = useRef<HTMLElement>(null);
  const bgRef         = useRef<HTMLDivElement>(null);
  const mainTextRef   = useRef<HTMLDivElement>(null);
  const videoWrapRef  = useRef<HTMLDivElement>(null);
  const videoDecorRef = useRef<HTMLDivElement>(null);
  const ctaRef        = useRef<HTMLDivElement>(null);
  const ctaTitleRef   = useRef<HTMLParagraphElement>(null);
  const ctaSubRef     = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const bg         = bgRef.current;
      const mainText   = mainTextRef.current;
      const videoWrap  = videoWrapRef.current;
      const videoDecor = videoDecorRef.current;
      const cta        = ctaRef.current;
      const ctaTitle   = ctaTitleRef.current;
      const ctaSub     = ctaSubRef.current;
      if (!bg || !mainText || !videoWrap || !videoDecor || !cta || !ctaTitle || !ctaSub) return;

      // ── Estado inicial ─────────────────────────────────────────────────────
      gsap.set(bg, { backgroundColor: "#050608" });

      gsap.set(mainText, {
        x: () => (window.innerWidth + mainText.scrollWidth) / 2 + Math.max(18, window.innerWidth * 0.02),
        opacity: 1,
      });

      // Círculo inicial — tamanho adaptado ao viewport
      const initSize = getInitialCircleSize();
      gsap.set(videoWrap, {
        opacity: 0,
        scale: 0.18,
        xPercent: -50,
        yPercent: -50,
        transformOrigin: "50% 50%",
        borderRadius: "9999px",
        width: initSize,
        height: initSize,
      });

      // Decoração inicia invisível com dimensões do círculo
      gsap.set(videoDecor, {
        width: initSize,
        height: initSize,
        opacity: 0,
        scale: 0.94,
        xPercent: -50,
        yPercent: -50,
        borderRadius: "9999px",
      });

      gsap.set(cta, { opacity: 0 });
      gsap.set(ctaTitle, { opacity: 0, y: 30 });
      gsap.set(ctaSub, { opacity: 0, y: 20 });

      // ── Timeline scrubbed ──────────────────────────────────────────────────
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=4200",
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // FASE 1 — fundo escuro → laranja
      tl.to(bg, {
        backgroundColor: "#ff6600",
        duration: 4.1,
        ease: "none",
      }, 0);

      // FASE 1 — texto entra da direita
      tl.to(mainText, {
        x: () => {
          const textWidth = mainText.scrollWidth;
          const vw = window.innerWidth;
          const sideBreath = Math.max(56, vw * 0.06);
          const stretch = textWidth * 0.08;
          return textWidth > vw
            ? Math.min(0, vw - textWidth - stretch - sideBreath)
            : 0;
        },
        duration: 5.4,
        ease: "sine.inOut",
      }, 0);

      // FASE 2 — texto sai pela esquerda
      tl.to(mainText, {
        x: () => -(mainText.scrollWidth + window.innerWidth * 0.18),
        opacity: 0,
        duration: 1.55,
        ease: "sine.inOut",
      }, ">+=0.08");

      // FASE 3 — círculo aparece
      tl.to(videoWrap, {
        opacity: 1,
        scale: 1,
        duration: 0.75,
        ease: "power3.out",
      }, "<+=0.95");

      tl.to(videoDecor, {
        opacity: 0.55,
        scale: 1,
        duration: 0.65,
        ease: "power3.out",
      }, "<");

      // FASE 4 — círculo expande para retângulo (vídeo + decoração em sincronia)
      tl.to(videoWrap, {
        width: () => getVideoFrame().width,
        height: () => getVideoFrame().height,
        borderRadius: () => getVideoFrame().borderRadius,
        duration: 2.4,
        ease: "expo.inOut",
      }, ">+=0.05");

      // Decoração cresce JUNTO com o vídeo, sempre DECOR_PADDING maior
      tl.to(videoDecor, {
        width: () => getDecorFrame().width,
        height: () => getDecorFrame().height,
        borderRadius: () => getVideoFrame().borderRadius, // acompanha arredondamento
        duration: 2.4,
        ease: "expo.inOut",
      }, "<"); // "<" = ao mesmo tempo

      // FASE 5 — CTA aparece
      tl.to(cta, { opacity: 1, duration: 0.01 }, "<+=0.9");
      tl.to(ctaTitle, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, "<");
      tl.to(ctaSub, { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "<+=0.3");

      // pausa final
      tl.to({}, { duration: 0.9 }, ">");

    }, section);

    return () => ctx.revert();
  }, [i18n.language]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      {/* BG animado */}
      <div
        ref={bgRef}
        style={{ position: "absolute", inset: 0, zIndex: 0, willChange: "background-color" }}
      />

      {/* Grain */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.038,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      {/* Labels decorativos */}
      <div aria-hidden style={{ position: "absolute", top: "clamp(14px,2.6vw,34px)", left: "clamp(14px,3vw,38px)", zIndex: 5, opacity: 0.16, display: "flex", flexDirection: "column", gap: 4 }}>
        {[20, 13, 7].map((w, i) => <div key={i} style={{ width: w, height: 1, background: "#fff" }} />)}
      </div>
      <div aria-hidden style={{ position: "absolute", top: "clamp(14px,2.6vw,34px)", right: "clamp(14px,3vw,38px)", zIndex: 5, opacity: 0.16, fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff" }}>
        {t("narrative.topLabel")}
      </div>

      {/* ── Enquadramento decorativo — cresce junto com o vídeo ── */}
      <div
        aria-hidden
        ref={videoDecorRef}
        style={{
          position: "absolute",
          zIndex: 2,
          left: "50%",
          top: "50%",
          pointerEvents: "none",
          color: "#050505",
          opacity: 0,
          willChange: "transform, opacity, width, height, border-radius",
          // Borda visível ao redor do vídeo
          border: "1.5px solid rgba(5,5,5,0.55)",
          borderRadius: FRAME_RADIUS,
          boxSizing: "border-box",
        }}
      >
        {/* Cantos brutalistas */}
        {[
          { top: -1, left: -1, borderTop: "2px solid currentColor", borderLeft: "2px solid currentColor" },
          { top: -1, right: -1, borderTop: "2px solid currentColor", borderRight: "2px solid currentColor" },
          { bottom: -1, left: -1, borderBottom: "2px solid currentColor", borderLeft: "2px solid currentColor" },
          { bottom: -1, right: -1, borderBottom: "2px solid currentColor", borderRight: "2px solid currentColor" },
        ].map((style, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              width: "clamp(14px, 2.2vw, 30px)",
              height: "clamp(14px, 2.2vw, 30px)",
              ...style,
            }}
          />
        ))}

        {/* Label topo */}
        <div
          style={{
            position: "absolute",
            top: "clamp(10px, 1.5vw, 18px)",
            left: "clamp(14px, 3.5vw, 48px)",
            fontSize: "clamp(0.42rem, 0.55vw, 0.56rem)",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "currentColor",
          }}
        >
          Evidence / Flow
        </div>

        {/* Grid de pontos — baixo direito */}
        <div
          style={{
            position: "absolute",
            right: "clamp(14px, 3.5vw, 48px)",
            bottom: "clamp(10px, 1.5vw, 18px)",
            display: "grid",
            gridTemplateColumns: "repeat(6, 4px)",
            gap: 5,
          }}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              style={{
                width: 4,
                height: 4,
                background: index % 3 === 0 ? "#050505" : "transparent",
                border: "1px solid currentColor",
              }}
            />
          ))}
        </div>

        {/* Linhas laterais */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "clamp(-28px, -2.2vw, -16px)",
            width: "clamp(14px, 1.8vw, 24px)",
            height: 2,
            transform: "translateY(-50%)",
            background: "currentColor",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "clamp(-28px, -2.2vw, -16px)",
            width: "clamp(14px, 1.8vw, 24px)",
            height: 2,
            transform: "translateY(-50%)",
            background: "currentColor",
          }}
        />
      </div>

      {/* ── Vídeo: círculo → retângulo ── */}
      <div
        ref={videoWrapRef}
        style={{
          position: "absolute",
          zIndex: 3,
          overflow: "hidden",
          willChange: "transform, opacity, border-radius, width, height",
          transformOrigin: "50% 50%",
          backfaceVisibility: "hidden",
          contain: "layout paint",
          left: "50%",
          top: "50%",
        }}
      >
        <video
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            transform: "translateZ(0)",
          }}
        />
        {/* Overlay escuro suave */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.44) 100%)",
          pointerEvents: "none",
        }} />
      </div>

      {/* ── CTA sobre o vídeo ── */}
      <div
        ref={ctaRef}
        style={{
          position: "absolute",
          zIndex: 4,
          textAlign: "center",
          pointerEvents: "none",
          willChange: "opacity",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(8px, 1.4vw, 14px)",
          width: "min(68vw, 640px)",
          padding: "0 clamp(16px, 4vw, 48px)",
        }}
      >
        <p
          ref={ctaTitleRef}
          style={{
            margin: 0,
            fontSize: "clamp(1.2rem, 3.2vw, 3.45rem)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#ffffff",
            willChange: "transform, opacity",
            textShadow: "0 2px 32px rgba(0,0,0,0.28)",
          }}
        >
          {t("narrative.ctaTitle")}
        </p>

        <div style={{ width: "clamp(28px, 3.5vw, 48px)", height: 1, background: "rgba(255,255,255,0.32)" }} />

        <p
          ref={ctaSubRef}
          style={{
            margin: 0,
            fontSize: "clamp(0.58rem, 0.95vw, 0.84rem)",
            fontWeight: 300,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.48)",
            maxWidth: 320,
            willChange: "transform, opacity",
          }}
        >
          {String(t("narrative.ctaSubtitle")).split("\n").map((line: string, index: number, lines: string[]) => (
            <span key={line}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      </div>

      {/* ── Texto principal — puxado pelo scroll ── */}
      <div
        ref={mainTextRef}
        style={{
          position: "absolute",
          zIndex: 5,
          width: "max-content",
          maxWidth: "none",
          padding: "0 clamp(14px, 3vw, 48px)",
          willChange: "transform",
          whiteSpace: "nowrap",
          overflow: "visible",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Syne', 'Arial Black', 'Impact', sans-serif",
            fontSize: "clamp(1.7rem, 5.15vw, 9.4rem)",
            fontWeight: 900,
            fontStretch: "expanded",
            fontVariationSettings: "'wdth' 125, 'wght' 900",
            letterSpacing: 0,
            lineHeight: 0.82,
            color: "#000000",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            transform: "scaleX(1.08)",
            transformOrigin: "left center",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {t("narrative.mainText")}
        </p>
      </div>

      {/* Número decorativo de fundo */}
      <div aria-hidden style={{
        position: "absolute", bottom: "-0.1em", right: "-0.04em",
        fontSize: "clamp(160px,32vw,400px)", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1,
        color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.04)",
        userSelect: "none", pointerEvents: "none", zIndex: 1,
      }}>
        02
      </div>

      {/* Linha decorativa inferior */}
      <div aria-hidden style={{
        position: "absolute", bottom: "clamp(18px,3.5vw,42px)",
        left: "clamp(20px,4vw,56px)", right: "clamp(20px,4vw,56px)",
        height: "1px",
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1) 20%,rgba(255,255,255,0.1) 80%,transparent)",
        zIndex: 5,
      }} />
    </section>
  );
}
