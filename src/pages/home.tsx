import Hero from "@/components/landing/Hero";
import Narrative from "@/components/landing/Narrative";
import Process from "@/components/landing/Process";
import Manifesto from "@/components/landing/Manifesto";
import Features from "@/components/landing/Features";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white">
      <div className="noise-overlay" />
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
