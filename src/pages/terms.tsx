import LegalPageLayout from "../components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Termos de Uso"
      title="Regras de uso para uma plataforma profissional e confiável."
      intro="Estes Termos de Uso regulam o acesso e a utilização da Fechou. Ao usar a plataforma, o usuário concorda em respeitar estas condições, agir de boa-fé e utilizar o serviço de forma compatível com sua finalidade legítima."
      highlight={
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.78)" }}>
          A Fechou foi criada para apoiar operações contratuais e comerciais com organização,
          clareza e responsabilidade. O uso da conta deve refletir esse mesmo padrão.
        </p>
      }
      sections={[
        {
          title: "Objeto da plataforma",
          body: (
            <>
              <p>
                A Fechou é uma plataforma digital destinada à criação, gestão, assinatura,
                acompanhamento e organização de contratos, propostas e fluxos relacionados.
              </p>
              <p>
                O serviço pode evoluir ao longo do tempo, com ajustes de funcionalidades, interface,
                critérios de uso, disponibilidade de planos e regras operacionais.
              </p>
            </>
          ),
        },
        {
          title: "Responsabilidades do usuário",
          body: (
            <>
              <p>
                O usuário é responsável pela veracidade, legitimidade e atualização das informações
                que inserir na plataforma, bem como pela utilização adequada dos documentos e fluxos
                que criar ou compartilhar por meio da Fechou.
              </p>
              <p>
                Também é responsabilidade do usuário manter a confidencialidade de suas credenciais,
                controlar o acesso à sua conta e adotar comportamento compatível com a lei, com estes
                Termos e com os direitos de terceiros.
              </p>
            </>
          ),
        },
        {
          title: "Uso adequado da conta",
          body: (
            <>
              <p>
                A conta é pessoal, vinculada ao contexto autorizado de uso e não deve ser utilizada
                para finalidades ilícitas, fraudulentas, abusivas ou incompatíveis com a proposta da
                plataforma.
              </p>
              <p>
                Sempre que houver indícios de uso indevido, a Fechou poderá solicitar medidas
                adicionais de verificação, restringir determinadas operações ou adotar providências
                necessárias à proteção do ambiente e dos usuários.
              </p>
            </>
          ),
        },
        {
          title: "Condutas proibidas",
          body: (
            <>
              <p>
                É proibido utilizar a Fechou para praticar fraude, violar direitos de terceiros,
                inserir conteúdo ilícito, manipular informações de forma enganosa, tentar obter acesso
                não autorizado, contornar restrições de segurança, explorar vulnerabilidades,
                interferir na integridade da plataforma ou realizar engenharia reversa, testes
                indevidos, automações abusivas ou qualquer comportamento que comprometa a operação do
                serviço.
              </p>
              <p>
                Também é vedado o uso da plataforma para finalidades que infrinjam a legislação
                aplicável, normas regulatórias ou deveres contratuais assumidos pelo usuário.
              </p>
            </>
          ),
        },
        {
          title: "Disponibilidade e limitações",
          body: (
            <>
              <p>
                A Fechou busca manter a plataforma estável, segura e funcional, mas o serviço pode
                passar por indisponibilidades temporárias, manutenções, atualizações, limitações
                técnicas, interrupções externas ou ajustes operacionais necessários.
              </p>
              <p>
                Nenhum conteúdo institucional da plataforma deve ser interpretado como promessa de
                resultado específico, consultoria jurídica individualizada ou garantia absoluta de
                disponibilidade contínua e sem falhas.
              </p>
            </>
          ),
        },
        {
          title: "Propriedade intelectual",
          body: (
            <>
              <p>
                A estrutura da plataforma, sua identidade visual, software, textos institucionais,
                marcas, sinais distintivos, interface e demais elementos protegidos pertencem à
                Fechou ou são utilizados legitimamente por ela.
              </p>
              <p>
                O uso da plataforma não transfere ao usuário qualquer direito de propriedade
                intelectual além das permissões estritamente necessárias ao uso regular do serviço.
              </p>
            </>
          ),
        },
        {
          title: "Suspensão ou encerramento de acesso",
          body: (
            <>
              <p>
                A Fechou poderá suspender, limitar ou encerrar o acesso à plataforma, com ou sem
                aviso prévio, quando identificar indícios de abuso, fraude, violação destes Termos,
                risco à segurança, uso incompatível com a legislação aplicável ou necessidade de
                proteção da operação e de terceiros.
              </p>
              <p>
                Essas medidas poderão ser adotadas de forma proporcional ao risco observado e sem
                prejuízo das providências legais e contratuais cabíveis.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
