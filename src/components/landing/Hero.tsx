"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

// ─── Configuração do vídeo ───────────────────────────────────────────────────
const VIDEO_SRC = "/videos/hero-fechou.mp4";

export default function Hero() {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textSteps = [
    {
      id: "t1",
      content: "Fechou!",
      isBrand: true,
    },
    {
      id: "t2",
      content: t("hero.calmQuestion"),
      isBrand: false,
    },
    {
      id: "t3",
      content: t("hero.calmPromise"),
      isBrand: false,
    },
    {
      id: "t4",
      content: "Fechou!",
      isBrand: true,
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {

      // Garantir que todos os textos estejam invisíveis
      textRefs.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { opacity: 0, filter: "blur(24px)", y: 40 });
      });

      // ── Timeline principal ──────────────────────────────────────────────
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=3800",
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Helper: entrada de texto
      const textIn = (el: HTMLDivElement | null, at: string | number = ">") => {
        if (!el) return;
        tl.to(
          el,
          {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            duration: 1.2,
            ease: "power3.out",
          },
          at
        );
      };

      // Helper: saída de texto
      const textOut = (el: HTMLDivElement | null, at: string | number = ">+=0.6") => {
        if (!el) return;
        tl.to(
          el,
          {
            opacity: 0,
            filter: "blur(18px)",
            y: -28,
            duration: 0.9,
            ease: "power3.in",
          },
          at
        );
      };

      // ── Step 1: "Fechou!" ───────────────────────────────────────────────
      textIn(textRefs.current[0], 0);
      textOut(textRefs.current[0], ">+=0.8");

      // ── Step 2: tranquilidade do vídeo ──────────────────────────────────
      textIn(textRefs.current[1], ">");
      // Leve vinheta extra ao scroll
      if (overlayRef.current) {
        tl.to(overlayRef.current, { opacity: 0.68, duration: 1 }, "<");
      }
      textOut(textRefs.current[1]);

      // ── Step 3: promessa da marca ───────────────────────────────────────
      if (overlayRef.current) {
        tl.to(overlayRef.current, { opacity: 0.54, duration: 0.8 }, "<");
      }
      textIn(textRefs.current[2], "<+=0.2");
      textOut(textRefs.current[2]);

      // ── Step 4: "Fechou!" final ─────────────────────────────────────────
      textIn(textRefs.current[3], ">");
      // Overlay mais escuro para impacto final
      if (overlayRef.current) {
        tl.to(overlayRef.current, { opacity: 0.78, duration: 1 }, "<");
      }
      // Mantém o último texto visível por um tempo
      tl.addPause(0.8);
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
        background: "#050608",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "72px", // altura da navbar
        paddingInline: "clamp(12px, 3vw, 40px)",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Decorações de fundo ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 8%, rgba(255,102,28,0.07) 0%, transparent 55%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Card do vídeo ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "min(1680px, 99vw)",
          height: "clamp(430px, 84vh, 940px)",
          borderRadius: "clamp(20px, 3vw, 40px)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.8), 0 40px 100px rgba(0,0,0,0.72)",
          zIndex: 1,
        }}
      >
        {/* Vídeo */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        >
          {/* Fallback */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg,#0d0f14 0%,#1a1c24 100%)",
            }}
          />
        </video>

        {/* Overlay escuro base */}
        <div
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.52,
            background:
              "linear-gradient(180deg, rgba(5,6,8,0.62) 0%, rgba(5,6,8,0.36) 38%, rgba(5,6,8,0.48) 72%, rgba(5,6,8,0.82) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Grain / noise sutil */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            opacity: 0.045,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Borda interna decorativa */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "1px",
            borderRadius: "inherit",
            border: "1px solid rgba(255,255,255,0.05)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        />

        {/* ── Camada de textos ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(24px,5vw,80px)",
          }}
        >
          {textSteps.map((step, i) => (
            <div
              key={step.id}
              ref={(el) => { textRefs.current[i] = el; }}
              style={{
                position: "absolute",
                textAlign: "center",
                width: "100%",
                padding: "0 clamp(16px,6vw,100px)",
                pointerEvents: "none",
                willChange: "opacity, transform, filter",
              }}
            >
              {step.isBrand ? (
                /* Título da marca */
                <p
                  className="font-display"
                  style={{
                    margin: 0,
                    fontSize: "clamp(3rem, 9vw, 8rem)",
                    lineHeight: 0.88,
                    letterSpacing: "-0.04em",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.96)",
                    textShadow: "none",
                  }}
                >
                  FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
                </p>
              ) : (
                /* Textos intermediários */
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(1.1rem, 3.2vw, 2.8rem)",
                    lineHeight: 1.32,
                    letterSpacing: "-0.025em",
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.88)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {step.content}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Label decorativo inferior esquerdo */}
        <div
          style={{
            position: "absolute",
            bottom: "clamp(14px,2.4vw,28px)",
            left: "clamp(14px,2.4vw,28px)",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: 0.38,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#ff6b1c",
            }}
          />
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {t("hero.labelLeft")}
          </span>
        </div>

        {/* Label decorativo inferior direito */}
        <div
          style={{
            position: "absolute",
            bottom: "clamp(14px,2.4vw,28px)",
            right: "clamp(14px,2.4vw,28px)",
            zIndex: 5,
            opacity: 0.28,
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#fff",
              fontWeight: 400,
            }}
          >
            {t("hero.labelRight")}
          </span>
        </div>
      </div>

      {/* ── Indicador de scroll ── */}
    </section>
  );
}
