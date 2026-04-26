import LegalPageLayout from "../components/legal/LegalPageLayout";

export default function SignatureProtectionPage() {
  return (
    <LegalPageLayout
      eyebrow="Assinaturas e Dados Contratuais"
      title="Proteção reforçada para o que formaliza a relação entre as partes."
      intro="Assinaturas, registros contratuais e dados relacionados à formalização de documentos recebem atenção especial na Fechou. Esse conjunto de informações é tratado como parte crítica da operação da plataforma e, por isso, está sujeito a controles e cuidados compatíveis com sua relevância."
      highlight={
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.78)" }}>
          O acesso a esses registros é restrito ao contexto necessário de operação, segurança,
          suporte e cumprimento de obrigações legais ou contratuais.
        </p>
      }
      sections={[
        {
          title: "Tratamento reforçado",
          body: (
            <>
              <p>
                Informações relacionadas à assinatura do cliente, ao histórico contratual e aos
                registros vinculados à formalização de documentos recebem tratamento reforçado. Isso
                significa que a Fechou busca adotar medidas compatíveis com a criticidade desse tipo
                de informação e com os riscos associados ao seu uso indevido.
              </p>
            </>
          ),
        },
        {
          title: "Controle de acesso e rastreabilidade",
          body: (
            <>
              <p>
                O acesso a dados contratuais e registros de assinatura é controlado conforme a
                necessidade operacional, com restrição de consulta e tratamento dentro do escopo
                permitido. A plataforma também preserva elementos de rastreabilidade institucional
                compatíveis com a finalidade de acompanhamento, segurança e integridade do histórico
                documental.
              </p>
            </>
          ),
        },
        {
          title: "Proteção contra uso indevido",
          body: (
            <>
              <p>
                A Fechou busca reduzir riscos de manipulação indevida, acesso não autorizado, uso
                incompatível com a finalidade da plataforma e exposição inadequada de informações
                contratuais. Esse cuidado se aplica tanto ao uso regular quanto a eventos que possam
                representar desvio de finalidade, abuso ou tentativa de exploração do ambiente.
              </p>
            </>
          ),
        },
        {
          title: "Discrição operacional",
          body: (
            <>
              <p>
                Para preservar a segurança da plataforma e de seus usuários, a Fechou evita divulgar
                publicamente detalhes operacionais específicos sobre os mecanismos internos de proteção
                aplicados a assinaturas, registros contratuais e dados sensíveis. Essa escolha faz
                parte da nossa postura de segurança responsável.
              </p>
            </>
          ),
        },
        {
          title: "Resumo para o usuário",
          body: (
            <>
              <p>
                Em termos simples: assinaturas e dados contratuais não são tratados como informação
                comum. Eles recebem proteção reforçada, acesso restrito, armazenamento seguro em nível
                institucional e controles voltados à preservação da integridade e da confiança do
                processo.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
