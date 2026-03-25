import { useRef, useEffect, useState, Suspense, lazy } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import ContractScreen from "./ContractScreen";

const Phone3DFallback = lazy(() => import("./Phone3D"));

interface PhoneCanvasProps {
  contractProgress: number;
  signingProgress: number;
  isComplete: boolean;
}

const PHONE_W = 2.4;
const PHONE_H = 4.96;
const PHONE_D = 0.18;
const CORNER_R = 0.36;

function PhoneModel({ contractProgress, signingProgress, isComplete }: PhoneCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotY = useRef(0);
  const targetRotX = useRef(0);
  const spinRef = useRef({ active: false, done: false, start: 0 });
  const prevComplete = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (spinRef.current.active || spinRef.current.done) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotY.current = nx * 18;
      targetRotX.current = ny * -10;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (!isComplete) {
      spinRef.current = { active: false, done: false, start: 0 };
    }
  }, [isComplete]);

  useEffect(() => {
    if (isComplete && !prevComplete.current) {
      spinRef.current = { active: true, done: false, start: 0 };
      targetRotY.current = 0;
      targetRotX.current = 0;
    }
    prevComplete.current = isComplete;
  }, [isComplete]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const spin = spinRef.current;

    if (spin.active) {
      if (spin.start === 0) spin.start = state.clock.elapsedTime;
      const t = Math.min((state.clock.elapsedTime - spin.start) / 3.4, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      groupRef.current.rotation.y = ease * Math.PI * 2;
      groupRef.current.rotation.x = Math.sin(ease * Math.PI * 2) * 0.09;
      if (t >= 1) {
        spin.active = false;
        spin.done = true;
        groupRef.current.rotation.y = 0;
        groupRef.current.rotation.x = 0;
      }
      return;
    }

    const tY = (targetRotY.current * Math.PI) / 180;
    const tX = (targetRotX.current * Math.PI) / 180;
    groupRef.current.rotation.y += (tY - groupRef.current.rotation.y) * 0.08;
    groupRef.current.rotation.x += (tX - groupRef.current.rotation.x) * 0.08;
  });

  const htmlW = 276;
  const htmlH = 596;
  const screenScaleX = (PHONE_W * 0.92) / htmlW;
  const screenScaleY = (PHONE_H * 0.92) / htmlH;

  return (
    <group ref={groupRef}>
      <RoundedBox args={[PHONE_W, PHONE_H, PHONE_D]} radius={CORNER_R} smoothness={8}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.4} />
      </RoundedBox>

      <Html
        transform
        occlude="blending"
        position={[0, 0, PHONE_D / 2 + 0.001]}
        scale={[screenScaleX, screenScaleY, 1]}
        style={{
          width: htmlW,
          height: htmlH,
          borderRadius: 36,
          overflow: "hidden",
          background: "#fff",
          pointerEvents: "none",
        }}
      >
        <div style={{ width: htmlW, height: htmlH, position: "relative", overflow: "hidden", borderRadius: 36 }}>
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 112, height: 33, borderRadius: "0 0 17px 17px", background: "#000", zIndex: 20,
          }}>
            <div style={{
              position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)",
              width: 13, height: 13, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #1a1a2e, #060608)",
              border: "1.5px solid rgba(255,255,255,0.04)",
            }} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingTop: 44 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0 20px 4px", fontSize: 11, color: "#0A0A0A", fontWeight: 700
            }}>
              <span>9:41</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 124, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.15)" }} />
        </div>
      </Html>

      <Html
        transform
        occlude="blending"
        position={[0, 0, -PHONE_D / 2 - 0.002]}
        rotation={[0, Math.PI, 0]}
        scale={[screenScaleX, screenScaleY, 1]}
        style={{
          width: 300,
          height: 620,
          borderRadius: 44,
          overflow: "hidden",
          background: "linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 50%, #161616 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ width: 300, height: 620, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
          <div style={{
            position: "absolute", top: 28, left: 100,
            width: 12, height: 12, borderRadius: "50%",
            background: "radial-gradient(circle, #f5deb3 0%, #c5a86a 60%, #888 100%)",
          }} />
          <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.03em", color: "#333", lineHeight: 1 }}>
            FECHOU<span style={{ color: "#FF5C00" }}>!</span>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "#444", marginTop: 8 }}>
            ASSINATURA DIGITAL
          </div>
          <div style={{
            position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.06)",
          }}>
            DESIGNED IN BRAZIL
          </div>
        </div>
      </Html>
    </group>
  );
}

function FallbackPhone({ contractProgress, signingProgress, isComplete }: PhoneCanvasProps) {
  return (
    <div style={{
      width: 340, height: 660,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, color: "#999", fontWeight: 600,
    }}>
      Carregando...
    </div>
  );
}

export default function PhoneCanvas({ contractProgress, signingProgress, isComplete }: PhoneCanvasProps) {
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) setWebglFailed(true);
    } catch {
      setWebglFailed(true);
    }
  }, []);

  if (webglFailed) {
    return (
      <Suspense fallback={<div style={{ width: 340, height: 660 }} />}>
        <Phone3DFallback contractProgress={contractProgress} signingProgress={signingProgress} isComplete={isComplete} />
      </Suspense>
    );
  }

  return (
    <div style={{ width: 340, height: 660, position: "relative" }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 40 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} />
        <directionalLight position={[-2, -1, 3]} intensity={0.2} />
        <Suspense fallback={null}>
          <PhoneModel
            contractProgress={contractProgress}
            signingProgress={signingProgress}
            isComplete={isComplete}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
