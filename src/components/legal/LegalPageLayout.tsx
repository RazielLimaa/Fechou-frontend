import type { CSSProperties, ReactNode } from "react";
import { Link } from "wouter";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export default function LegalPageLayout({
  eyebrow,
  title,
  intro,
  sections,
  highlight,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  highlight?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f1eb",
        color: "#09090b",
        fontFamily: "'DM Sans','Inter',sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "40px 20px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <Link href="/">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: "#09090b",
                fontWeight: 800,
                letterSpacing: "-0.05em",
                fontSize: 28,
              }}
            >
              FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
            </span>
          </Link>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/privacidade">
              <span style={navStyle}>Privacidade</span>
            </Link>
            <Link href="/termos">
              <span style={navStyle}>Termos</span>
            </Link>
            <Link href="/seguranca">
              <span style={navStyle}>Segurança</span>
            </Link>
            <Link href="/assinaturas-e-dados-contratuais">
              <span style={navStyle}>Assinaturas</span>
            </Link>
          </div>
        </div>

        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(9,9,11,0.08)",
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(9,9,11,0.06)",
          }}
        >
          <div
            style={{
              padding: "40px 28px 28px",
              borderBottom: "1px solid rgba(9,9,11,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,102,0,0.08) 0%, rgba(255,255,255,0.92) 70%)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#ff6600",
                fontWeight: 700,
              }}
            >
              {eyebrow}
            </p>
            <h1
              style={{
                margin: "18px 0 0",
                fontSize: "clamp(34px, 6vw, 64px)",
                lineHeight: 0.95,
                letterSpacing: "-0.05em",
                fontWeight: 900,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: "18px 0 0",
                maxWidth: 760,
                fontSize: 16,
                lineHeight: 1.8,
                color: "rgba(9,9,11,0.68)",
              }}
            >
              {intro}
            </p>
          </div>

          {highlight ? (
            <div
              style={{
                margin: "24px 28px 0",
                padding: "18px 18px",
                borderRadius: 20,
                background: "#09090b",
                color: "#fff",
              }}
            >
              {highlight}
            </div>
          ) : null}

          <div style={{ padding: "28px" }}>
            {sections.map((section) => (
              <section
                key={section.title}
                style={{
                  padding: "0 0 28px",
                  marginBottom: 28,
                  borderBottom: "1px solid rgba(9,9,11,0.08)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    fontWeight: 800,
                  }}
                >
                  {section.title}
                </h2>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 15,
                    lineHeight: 1.85,
                    color: "rgba(9,9,11,0.72)",
                  }}
                >
                  {section.body}
                </div>
              </section>
            ))}

            <div style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(9,9,11,0.62)" }}>
              <strong style={{ color: "#09090b" }}>Contato Fechou:</strong>{" "}
              <a href="mailto:fechoou@gmail.com" style={{ color: "#ff6600", textDecoration: "none" }}>
                fechoou@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const navStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(9,9,11,0.08)",
  background: "rgba(255,255,255,0.78)",
  color: "rgba(9,9,11,0.72)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
