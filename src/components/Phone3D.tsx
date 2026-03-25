import { useRef, useEffect, useState } from "react";
import { useSpring, motion } from "framer-motion";
import ContractScreen from "./ContractScreen";

interface Phone3DProps {
  contractProgress: number;
  signingProgress: number;
  isComplete: boolean;
}

const DEPTH = 24;
const HALF  = DEPTH / 2;
const W     = 300;
const H     = 620;
const RAD   = 44;

export default function Phone3D({ contractProgress, signingProgress, isComplete }: Phone3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rotY = useSpring(0, { stiffness: 32, damping: 18 });
  const rotX = useSpring(0, { stiffness: 32, damping: 18 });
  const [tiltY, setTiltY] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  useEffect(() => rotY.on("change", setTiltY), [rotY]);
  useEffect(() => rotX.on("change", setTiltX), [rotX]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinRockX, setSpinRockX] = useState(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isSpinning || spinDone) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      rotY.set(nx * 18);
      rotX.set(ny * -10);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [isSpinning, spinDone]);

  useEffect(() => {
    if (!isComplete) {
      cancelRef.current = true;
      setIsSpinning(false);
      setSpinDone(false);
      setSpinDeg(0);
      setSpinRockX(0);
    }
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete || isSpinning || spinDone) return;
    setIsSpinning(true);
    rotY.set(0);
    rotX.set(0);
    cancelRef.current = false;
    let start: number | null = null;
    const DUR = 3400;
    const tick = (ts: number) => {
      if (cancelRef.current) return;
      if (!start) start = ts;
      const t = Math.min((ts - start) / DUR, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setSpinDeg(ease * 360);
      setSpinRockX(Math.sin(ease * Math.PI * 2) * 5);
      if (t < 1) requestAnimationFrame(tick);
      else { setSpinDeg(0); setSpinRockX(0); setIsSpinning(false); setSpinDone(true); }
    };
    requestAnimationFrame(tick);
  }, [isComplete, isSpinning, spinDone]);

  const effectY = isSpinning ? spinDeg : spinDone ? 0 : tiltY;
  const effectX = isSpinning ? spinRockX : spinDone ? 0 : tiltX;
  const trans = isSpinning ? "none" : "transform 0.55s cubic-bezier(.25,.46,.45,.94)";

  return (
    <div ref={wrapperRef} className="relative inline-block" style={{ perspective: "1100px" }}>

      {/* Orange glow */}
      <div className="absolute pointer-events-none" style={{
        inset: "-50px", borderRadius: "80px", zIndex: -1,
        background: `radial-gradient(ellipse at 50% 65%, rgba(255,92,0,${0.08 + signingProgress * 0.28}) 0%, transparent 65%)`,
        filter: "blur(28px)",
      }} />

      {/* ═══ 3D Phone Container ═══ */}
      <div style={{
        width: W, height: H,
        position: "relative",
        transformStyle: "preserve-3d",
        transform: `rotateY(${effectY}deg) rotateX(${effectX}deg)`,
        transition: trans,
      }}>

        {/* ─── FRONT FACE ─── */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `translateZ(${HALF}px)`,
          backfaceVisibility: "hidden",
          borderRadius: RAD,
          background: "linear-gradient(160deg, #282828 0%, #0e0e0e 42%, #1c1c1c 100%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.8)",
        }}>
          {/* Specular highlight */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: RAD, pointerEvents: "none",
            background: `linear-gradient(${140 + tiltY * 1.5}deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 30%, transparent 55%)`,
          }} />

          {/* Side buttons */}
          <div style={{ position: "absolute", left: -3, top: 115, width: 3, height: 44, borderRadius: "2px 0 0 2px", background: "linear-gradient(180deg,#303030,#1a1a1a)" }} />
          <div style={{ position: "absolute", left: -3, top: 170, width: 3, height: 44, borderRadius: "2px 0 0 2px", background: "linear-gradient(180deg,#303030,#1a1a1a)" }} />
          <div style={{ position: "absolute", right: -3, top: 130, width: 3, height: 60, borderRadius: "0 2px 2px 0", background: "linear-gradient(180deg,#303030,#1a1a1a)" }} />

          {/* Dynamic Island */}
          <div style={{
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            width: 112, height: 33, borderRadius: 17, background: "#000", zIndex: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}>
            <div style={{
              position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)",
              width: 13, height: 13, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #1a1a2e, #060608)",
              border: "1.5px solid rgba(255,255,255,0.04)",
              boxShadow: "inset 0 0 5px rgba(40,80,255,0.2)",
            }} />
          </div>

          {/* Screen */}
          <div style={{
            position: "absolute", top: 12, left: 12, right: 12, bottom: 12,
            borderRadius: 36, overflow: "hidden", background: "#fff",
          }}>
            <div className="absolute inset-0 flex flex-col" style={{ paddingTop: 58 }}>
              <div className="flex justify-between items-center px-5 pb-1" style={{ fontSize: 11, color: "#0A0A0A", fontWeight: 700 }}>
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="9" viewBox="0 0 16 10" fill="#0A0A0A">
                    <rect x="0" y="3" width="3" height="7" rx="0.5" opacity="0.3" />
                    <rect x="4" y="2" width="3" height="8" rx="0.5" opacity="0.55" />
                    <rect x="8" y="1" width="3" height="9" rx="0.5" opacity="0.8" />
                    <rect x="12" y="0" width="3" height="10" rx="0.5" />
                  </svg>
                  <svg width="13" height="10" viewBox="0 0 15 11" fill="#0A0A0A">
                    <path d="M7.5 2C5.5 2 3.7 2.8 2.4 4.1L1 2.7C2.7 1 5 0 7.5 0S12.3 1 14 2.7L12.6 4.1C11.3 2.8 9.5 2 7.5 2Z" opacity="0.35" />
                    <path d="M7.5 4.5C6.1 4.5 4.8 5.1 3.9 6L2.5 4.6C3.8 3.3 5.5 2.5 7.5 2.5S11.2 3.3 12.5 4.6L11.1 6C10.2 5.1 8.9 4.5 7.5 4.5Z" opacity="0.7" />
                    <circle cx="7.5" cy="9" r="1.5" />
                  </svg>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 20, height: 10, border: "1.5px solid #0A0A0A", borderRadius: 2, padding: 1 }}>
                      <div style={{ height: "100%", width: "78%", background: "#0A0A0A", borderRadius: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
              <ContractScreen contractProgress={contractProgress} signingProgress={signingProgress} isComplete={isComplete} />
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 36, pointerEvents: "none", boxShadow: "inset 0 0 18px rgba(0,0,0,0.06)" }} />
          </div>

          {/* Home indicator */}
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 124, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* ─── BACK FACE — "Fechou!" branding ─── */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `rotateY(180deg) translateZ(${HALF}px)`,
          backfaceVisibility: "hidden",
          borderRadius: RAD,
          background: "linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 50%, #161616 100%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.12)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Camera module (top-left) */}
          <div style={{
            position: "absolute", top: 20, left: 20,
            width: 70, height: 70, borderRadius: 18,
            background: "linear-gradient(145deg, #1e1e1e, #111)",
            border: "1.5px solid rgba(255,255,255,0.08)",
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
            gap: 6, padding: 8,
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "radial-gradient(circle at 38% 38%, #1a1a2e, #050508)",
                border: "2px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 0 6px rgba(40,80,255,0.15), 0 0 4px rgba(0,0,0,0.6)",
              }} />
            ))}
          </div>

          {/* Flash */}
          <div style={{
            position: "absolute", top: 28, left: 100,
            width: 12, height: 12, borderRadius: "50%",
            background: "radial-gradient(circle, #f5deb3 0%, #c5a86a 60%, #888 100%)",
            boxShadow: "0 0 4px rgba(255,200,100,0.3)",
          }} />

          {/* FECHOU! brand logo */}
          <div style={{
            fontWeight: 900, fontSize: 36, letterSpacing: "-0.03em",
            color: "#333", lineHeight: 1,
          }}>
            FECHOU<span style={{ color: "#FF5C00" }}>!</span>
          </div>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
            color: "#444", marginTop: 8,
          }}>
            ASSINATURA DIGITAL
          </div>

          {/* Subtle Fechou logo watermark */}
          <div style={{
            position: "absolute", bottom: 30, left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.06)",
          }}>
            DESIGNED IN BRAZIL
          </div>

          {/* Matte texture overlay */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: RAD, pointerEvents: "none",
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
          }} />
        </div>

        {/* ─── LEFT EDGE ─── */}
        <div style={{
          position: "absolute",
          left: -HALF, top: RAD,
          width: DEPTH, height: H - RAD * 2,
          transform: "rotateY(-90deg)",
          background: "linear-gradient(180deg, #222 0%, #0f0f0f 50%, #1a1a1a 100%)",
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.4)",
        }}>
          <div style={{ position: "absolute", left: 3, top: 80, width: 6, height: 38, borderRadius: 3, background: "#333" }} />
          <div style={{ position: "absolute", left: 3, top: 128, width: 6, height: 38, borderRadius: 3, background: "#333" }} />
        </div>

        {/* ─── RIGHT EDGE ─── */}
        <div style={{
          position: "absolute",
          right: -HALF, top: RAD,
          width: DEPTH, height: H - RAD * 2,
          transform: "rotateY(90deg)",
          background: "linear-gradient(180deg, #1e1e1e 0%, #0f0f0f 50%, #181818 100%)",
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.4)",
        }}>
          <div style={{ position: "absolute", right: 3, top: 90, width: 6, height: 52, borderRadius: 3, background: "#333" }} />
        </div>

        {/* ─── TOP EDGE ─── */}
        <div style={{
          position: "absolute",
          top: -HALF, left: RAD,
          width: W - RAD * 2, height: DEPTH,
          transform: "rotateX(90deg)",
          background: "linear-gradient(90deg, #1a1a1a, #0f0f0f, #1a1a1a)",
          boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
        }} />

        {/* ─── BOTTOM EDGE ─── */}
        <div style={{
          position: "absolute",
          bottom: -HALF, left: RAD,
          width: W - RAD * 2, height: DEPTH,
          transform: "rotateX(-90deg)",
          background: "linear-gradient(90deg, #1a1a1a, #0f0f0f, #1a1a1a)",
          boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
        }} />
      </div>

      {/* Floor shadow */}
      <div style={{
        position: "absolute", bottom: -20, left: "15%",
        width: "70%", height: 32,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
        filter: "blur(14px)", borderRadius: "50%",
      }} />

      {/* Ink particles while signing */}
      {signingProgress > 0 && signingProgress < 1 && (
        <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
          {[...Array(5)].map((_, i) => (
            <motion.div key={i} className="absolute"
              style={{
                left: `${22 + i * 12}%`, bottom: "28%",
                width: `${3 + i % 3}px`, height: `${3 + i % 3}px`,
                borderRadius: "50%", background: "#FF5C00",
              }}
              animate={{ y: [0, -52 - i * 10], x: [0, (i % 2 ? 1 : -1) * (8 + i * 5)], opacity: [1, 0], scale: [1, 0] }}
              transition={{ duration: 2 + i * 0.25, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
