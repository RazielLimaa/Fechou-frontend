import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="space-y-6">
          <h1 className="font-display text-[8vw] md:text-[4rem] leading-[0.8] tracking-[-0.04em] mb-8">
            <span className="text-reveal">FECHOU</span>
            <span
              style={{
                color: "#ff7a00",
                fontStyle: "italic",
                textShadow: "0 0 12px rgba(255, 122, 0, 0.95), 0 0 28px rgba(255, 122, 0, 0.75)",
              }}
            >
              !
            </span>
          </h1>

          <p className="text-muted-foreground max-w-xs">
            A ferramenta definitiva para freelancers modernos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-accent transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Manifesto</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-accent transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Termos</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 text-center md:text-left text-xs text-muted-foreground/50">
        © 2024 Fechou! Inc. Todos os direitos reservados.
      </div>
    </footer>
  );
}
