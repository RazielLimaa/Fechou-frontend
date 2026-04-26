import LegalPageLayout from "../components/legal/LegalPageLayout";

export default function SecurityPage() {
  return (
    <LegalPageLayout
      eyebrow="Segurança dos Dados"
      title="Proteção contínua, sem promessas irreais."
      intro="A Fechou adota medidas administrativas, técnicas e organizacionais compatíveis com a natureza dos dados tratados e com os riscos inerentes às atividades da plataforma. Segurança, para nós, é um compromisso permanente de prevenção, controle, revisão e resposta responsável."
      highlight={
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.78)" }}>
          Nosso objetivo é proteger a confidencialidade, a integridade e o acesso adequado às
          informações, especialmente em operações sensíveis e em registros contratuais.
        </p>
      }
      sections={[
        {
          title: "Medidas compatíveis com a criticidade dos dados",
          body: (
            <>
              <p>
                A Fechou adota salvaguardas compatíveis com o tipo de informação tratada e com a
                criticidade das operações realizadas dentro da plataforma. Isso inclui práticas voltadas
                à proteção de contas, limitação de acessos, preservação da integridade do ambiente e
                redução de riscos associados a uso indevido.
              </p>
              <p>
                Dados de maior sensibilidade operacional, como registros contratuais e informações
                relacionadas à assinatura, recebem tratamento reforçado e controles mais restritivos
                compatíveis com a sua relevância.
              </p>
            </>
          ),
        },
        {
          title: "Controle de acesso e prevenção de uso indevido",
          body: (
            <>
              <p>
                O acesso a informações dentro da Fechou é orientado por critérios de necessidade,
                função e contexto operacional. A plataforma também adota práticas para identificar
                comportamentos incompatíveis com o uso regular do serviço e limitar ações que possam
                comprometer usuários, documentos ou fluxos internos.
              </p>
              <p>
                Não divulgamos publicamente detalhes operacionais desses mecanismos, justamente para
                preservar a segurança do ambiente e evitar exposição desnecessária a riscos.
              </p>
            </>
          ),
        },
        {
          title: "Credenciais, sessões e dados sensíveis",
          body: (
            <>
              <p>
                A Fechou trata credenciais, sessões, dados pessoais e informações sensíveis com
                atenção proporcional ao risco. Nosso compromisso é reduzir exposição indevida, restringir
                acessos não autorizados e manter proteção institucional adequada durante o ciclo de uso
                da plataforma.
              </p>
              <p>
                Esse cuidado também se aplica a operações de autenticação, recuperação de acesso e
                ações com potencial impacto sobre contas e documentos.
              </p>
            </>
          ),
        },
        {
          title: "Melhoria contínua e resposta a incidentes",
          body: (
            <>
              <p>
                Nenhuma plataforma séria deve prometer risco zero ou invulnerabilidade. A Fechou não
                faz esse tipo de afirmação. O que assumimos é o compromisso de revisar continuamente
                práticas de proteção, aperfeiçoar controles, monitorar sinais relevantes e responder de
                forma responsável a eventos de segurança quando necessário.
              </p>
              <p>
                Sempre que cabível, adotaremos as medidas apropriadas para contenção, análise,
                mitigação e cumprimento de deveres legais relacionados a incidentes.
              </p>
            </>
          ),
        },
        {
          title: "Compromisso com sua privacidade e segurança",
          body: (
            <>
              <p>
                A Fechou trata privacidade e segurança como parte essencial da experiência do produto.
                Isso significa cuidar do acesso à conta, proteger dados pessoais e contratuais com
                responsabilidade e adotar medidas institucionais compatíveis com a sensibilidade das
                informações tratadas.
              </p>
              <p>
                Embora nenhuma plataforma possa eliminar todos os riscos, nosso compromisso é atuar
                com seriedade, melhoria contínua e resposta responsável para preservar a confiança de
                usuários, clientes e documentos formalizados no ambiente da Fechou.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
