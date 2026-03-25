import { useEffect, useState } from "react";
import Hero from "../components/landing/Hero";
import Narrative from "../components/landing/Narrative";
import Process from "../components/landing/Process";
import Manifesto from "../components/landing/Manifesto";
import Features from "../components/landing/Features";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import FechouLaunchPopup from "../components/landing/LaunchExperiencePopup";

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
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white">
      <div className="noise-overlay" />

      <FechouLaunchPopup
        open={openPopup}
        onClose={handleClose}
        whatsappNumber="5511949507668"
      />

      <Navbar />

      <main>
        <Hero />
        <Narrative />
        <Process />
        <Manifesto />
        <div className="relative">
          <div className="blur-blob bg-accent/20 top-[20%] left-[-10%]" />
          <Features />
        </div>
      </main>

      <Footer />
    </div>
  );
}