import { Suspense, lazy, useEffect, useState } from "react";
import Hero from "../components/landing/Hero";
import Navbar from "../components/landing/Navbar";
import FechouLaunchPopup from "../components/landing/LaunchExperiencePopup";

const Narrative = lazy(() => import("../components/landing/Narrative"));
const Process = lazy(() => import("../components/landing/Process"));
const Manifesto = lazy(() => import("../components/landing/Manifesto"));
const Features = lazy(() => import("../components/landing/Features"));
const Footer = lazy(() => import("../components/landing/Footer"));

function SectionFallback({ minHeight }: { minHeight: number }) {
  return <div style={{ minHeight }} />;
}

export default function Home() {
  const [openPopup, setOpenPopup] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("fechou_launch_popup_closed");

    if (!hasSeenPopup) {
      const timer = window.setTimeout(() => {
        setOpenPopup(true);
      }, 900);

      return () => window.clearTimeout(timer);
    }
  }, []);

  function handleClose() {
    localStorage.setItem("fechou_launch_popup_closed", "true");
    setOpenPopup(false);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050608] text-foreground selection:bg-accent selection:text-white">
      <div className="noise-overlay" />

      <FechouLaunchPopup
        open={openPopup}
        onClose={handleClose}
        whatsappNumber="5511949507668"
      />

      <Navbar />

      <main className="relative w-full overflow-x-hidden bg-[#050608]">
        <div className="pointer-events-none absolute inset-x-0 top-[18vh] h-[42rem] bg-[radial-gradient(circle_at_top,rgba(255,102,0,0.18),transparent_40%)] blur-3xl opacity-80" />
        <div className="pointer-events-none absolute inset-x-0 top-[72vh] h-[160rem] bg-[linear-gradient(180deg,rgba(9,10,14,0)_0%,rgba(9,10,14,0.82)_16%,rgba(9,10,14,1)_100%)]" />
        <Hero />
        <Suspense fallback={<SectionFallback minHeight={900} />}>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[8%] top-16 h-44 w-44 rounded-full bg-[#ff7a1a]/12 blur-3xl" />
            <Narrative />
          </div>
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={720} />}>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute right-[10%] top-20 h-52 w-52 rounded-full bg-white/6 blur-3xl" />
            <Process />
          </div>
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={960} />}>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full bg-[#ff8b3e]/10 blur-3xl" />
            <Manifesto />
          </div>
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={860} />}>
          <div className="relative overflow-hidden">
            <div className="blur-blob bg-accent/20 top-[20%] left-[-10%]" />
            <div className="pointer-events-none absolute right-[8%] top-[12%] h-48 w-48 rounded-full bg-white/6 blur-3xl" />
            <Features />
          </div>
        </Suspense>
      </main>

      <Suspense fallback={<SectionFallback minHeight={280} />}>
        <Footer />
      </Suspense>
    </div>
  );
}
