export type Profession =
  | "web" | "branding" | "mobile" | "software" | "design"
  | "marketing" | "juridico" | "saude" | "educacao"
  | "eventos" | "estetica" | "fotografia";

export type ClauseCategory =
  | "pagamento" | "prazo" | "multas" | "confidencialidade"
  | "propriedade_intelectual" | "rescisao" | "responsabilidades"
  | "foro" | "disposicoes_gerais" | "especifica";

export interface Clause {
  id: string;
  title: string;
  category: ClauseCategory;
  content: string;
  tags: Profession[];
  isDefault?: boolean;
}

export const CATEGORIES: { id: ClauseCategory; label: string }[] = [
  { id: "pagamento", label: "Pagamento" },
  { id: "prazo", label: "Prazo" },
  { id: "multas", label: "Multas" },
  { id: "confidencialidade", label: "Confidencialidade" },
  { id: "propriedade_intelectual", label: "Prop. Intelectual" },
  { id: "rescisao", label: "Rescisão" },
  { id: "responsabilidades", label: "Responsabilidades" },
  { id: "foro", label: "Foro" },
  { id: "disposicoes_gerais", label: "Disposições Gerais" },
  { id: "especifica", label: "Específica" },
];

export const CLAUSES: Clause[] = [
  // PAGAMENTO
  {
    id: "pag-001",
    title: "Condições de Pagamento",
    category: "pagamento",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `O(A) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor total de {{valor}}, a título de remuneração pelos serviços descritos neste contrato, na forma de {{forma_pagamento}}.\n\nO pagamento deverá ser realizado até a data acordada entre as partes, sob pena de incidência de juros moratórios de 1% (um por cento) ao mês e multa de 2% (dois por cento) sobre o valor em aberto.`,
  },
  {
    id: "pag-002",
    title: "Pagamento com Sinal",
    category: "pagamento",
    tags: ["web","branding","mobile","software","design","marketing","eventos","fotografia"],
    content: `O(A) CONTRATANTE realizará o pagamento de 50% (cinquenta por cento) do valor total contratado como sinal na assinatura deste contrato, e os 50% (cinquenta por cento) restantes na entrega final dos serviços.\n\nO início dos trabalhos ficará condicionado à confirmação do pagamento do sinal.`,
  },
  {
    id: "pag-003",
    title: "Pagamento por Etapas",
    category: "pagamento",
    tags: ["web","branding","mobile","software","design","marketing"],
    content: `O valor de {{valor}} será dividido em etapas conforme cronograma de entregas:\n\n- 30% na assinatura do contrato;\n- 40% na aprovação da etapa intermediária;\n- 30% na entrega final.\n\nA não aprovação de cada etapa não desobriga o pagamento das parcelas correspondentes, desde que o trabalho tenha sido devidamente entregue.`,
  },
  {
    id: "pag-004",
    title: "Honorários Mensais",
    category: "pagamento",
    tags: ["marketing","juridico","saude","educacao"],
    content: `Os serviços serão remunerados mediante honorários mensais no valor de {{valor}}, pagos até o dia 5 (cinco) de cada mês subsequente ao da prestação dos serviços.\n\nOs valores serão reajustados anualmente com base no índice IGPM/FGV ou outro índice que o venha a substituir.`,
  },

  // PRAZO
  {
    id: "prazo-001",
    title: "Prazo de Execução",
    category: "prazo",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `O prazo de execução dos serviços objeto deste contrato inicia-se em {{data_execucao}}, podendo ser prorrogado mediante acordo escrito entre as partes.\n\nAtrasos decorrentes de fatores externos à competência do(a) CONTRATADO(A), como falta de informações ou aprovações por parte do(a) CONTRATANTE, não serão computados no prazo acima estabelecido.`,
  },
  {
    id: "prazo-002",
    title: "Prazo de Entrega de Arquivos Finais",
    category: "prazo",
    tags: ["design","branding","fotografia","eventos"],
    content: `Os arquivos finais serão entregues em até 15 (quinze) dias úteis após a aprovação da última revisão pelo(a) CONTRATANTE.\n\nA entrega será realizada por meio digital (link ou e-mail), em formatos acordados previamente entre as partes.`,
  },
  {
    id: "prazo-003",
    title: "Prazo de Revisões",
    category: "prazo",
    tags: ["design","branding","web","mobile","software","marketing"],
    content: `Estão incluídas neste contrato até 3 (três) rodadas de revisão sobre o trabalho entregue. Revisões adicionais serão cobradas separadamente, conforme tabela de valores vigente do(a) CONTRATADO(A).\n\nCada rodada de revisão terá prazo de retorno de 5 (cinco) dias úteis.`,
  },
  {
    id: "prazo-004",
    title: "Validade do Contrato",
    category: "prazo",
    tags: ["marketing","juridico","saude","educacao"],
    content: `Este contrato terá vigência de 12 (doze) meses a contar da data de sua assinatura, podendo ser renovado automaticamente por igual período, salvo manifestação contrária de qualquer das partes com antecedência mínima de 30 (trinta) dias.`,
  },

  // MULTAS
  {
    id: "multa-001",
    title: "Multa por Atraso de Pagamento",
    category: "multas",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `O atraso no pagamento das parcelas devidas sujeitará o(a) CONTRATANTE ao pagamento de:\n\n- Multa de 2% (dois por cento) sobre o valor em aberto;\n- Juros moratórios de 1% (um por cento) ao mês, calculados pro rata die;\n- Correção monetária pelo índice IGPM/FGV.\n\nDecorridos 30 (trinta) dias de inadimplência, o(a) CONTRATADO(A) poderá suspender os serviços até a regularização da situação.`,
  },
  {
    id: "multa-002",
    title: "Multa por Cancelamento",
    category: "multas",
    tags: ["web","branding","mobile","software","design","marketing","juridico","eventos","fotografia"],
    content: `Em caso de cancelamento unilateral do contrato pelo(a) CONTRATANTE após o início dos trabalhos, serão devidos:\n\n- O valor proporcional ao trabalho já executado;\n- Multa compensatória equivalente a 20% (vinte por cento) do valor total contratado.\n\nO cancelamento deverá ser comunicado por escrito com antecedência mínima de 15 (quinze) dias.`,
  },
  {
    id: "multa-003",
    title: "Multa por Cancelamento de Evento",
    category: "multas",
    tags: ["eventos","fotografia"],
    content: `Em caso de cancelamento do evento ou sessão fotográfica pelo(a) CONTRATANTE:\n\n- Com mais de 30 dias de antecedência: devolução do sinal deduzindo 20% a título de taxa administrativa;\n- Entre 15 e 30 dias: perda integral do sinal;\n- Com menos de 15 dias: pagamento de 50% do valor total contratado.\n\nCancelamentos por força maior devidamente comprovados estão sujeitos a análise individual.`,
  },

  // CONFIDENCIALIDADE
  {
    id: "conf-001",
    title: "Confidencialidade Padrão",
    category: "confidencialidade",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `As partes comprometem-se a manter em sigilo todas as informações confidenciais obtidas em razão deste contrato, incluindo dados, processos, estratégias e informações técnicas ou comerciais.\n\nA obrigação de confidencialidade permanece em vigor por 2 (dois) anos após o término deste contrato.\n\nA violação desta cláusula sujeitará a parte infratora ao pagamento de perdas e danos devidamente comprovados.`,
  },
  {
    id: "conf-002",
    title: "Confidencialidade Reforçada",
    category: "confidencialidade",
    tags: ["juridico","saude","software"],
    content: `As partes reconhecem que as informações trocadas neste contrato são de natureza altamente sigilosa e estratégica.\n\nFica expressamente proibido o compartilhamento, sublicenciamento ou uso de qualquer informação confidencial para fins alheios ao objeto deste contrato, sob pena de multa de R$ 50.000,00 (cinquenta mil reais) por violação, além das perdas e danos apurados.\n\nEsta obrigação é perpétua e não é afetada pelo término do contrato.`,
  },

  // PROPRIEDADE INTELECTUAL
  {
    id: "pi-001",
    title: "Propriedade Intelectual — Cessão Total",
    category: "propriedade_intelectual",
    tags: ["web","mobile","software","design","branding","marketing"],
    content: `Após o pagamento integral do valor contratado, todos os direitos patrimoniais sobre os trabalhos desenvolvidos serão cedidos ao(à) CONTRATANTE, de forma irrevogável, irretratável e por prazo indeterminado.\n\nOs direitos morais do(a) CONTRATADO(A) permanecem íntegros, sendo-lhe assegurado o direito de indicar a autoria do trabalho em portfólio profissional.`,
  },
  {
    id: "pi-002",
    title: "Licenciamento de Código",
    category: "propriedade_intelectual",
    tags: ["web","mobile","software"],
    content: `O código desenvolvido será licenciado ao(à) CONTRATANTE após o pagamento integral, sendo permitido seu uso, modificação e distribuição para fins relacionados ao projeto descrito neste contrato.\n\nFrameworks, bibliotecas e componentes de terceiros utilizados no projeto permanecem sujeitos às suas respectivas licenças originais.\n\nO(A) CONTRATANTE não poderá revender o código como produto standalone sem autorização prévia e escrita.`,
  },
  {
    id: "pi-003",
    title: "Direitos Autorais — Design",
    category: "propriedade_intelectual",
    tags: ["design","branding"],
    content: `Os direitos autorais sobre as criações desenvolvidas serão cedidos ao(à) CONTRATANTE após o pagamento integral, conforme previsto na Lei 9.610/98.\n\nO(A) CONTRATADO(A) reserva-se o direito de utilizar imagens das peças criadas para divulgação em portfólio, salvo cláusula expressa em contrário.\n\nFontes e elementos gráficos de terceiros utilizados permanecem sujeitos às respectivas licenças de uso.`,
  },
  {
    id: "pi-004",
    title: "Direito de Imagem",
    category: "propriedade_intelectual",
    tags: ["fotografia","eventos","estetica"],
    content: `O(A) CONTRATANTE autoriza expressamente a utilização de imagens produzidas durante a execução deste contrato para fins de divulgação em portfólio e redes sociais do(a) CONTRATADO(A), sem ônus adicional.\n\nCaso o(a) CONTRATANTE não deseje a divulgação das imagens, deverá comunicar por escrito no ato da assinatura deste contrato, podendo ser aplicada taxa adicional de exclusividade.`,
  },
  {
    id: "pi-005",
    title: "Uso de Marca",
    category: "propriedade_intelectual",
    tags: ["branding","marketing","design"],
    content: `O(A) CONTRATADO(A) poderá mencionar o nome do(a) CONTRATANTE como cliente em seu portfólio e materiais de divulgação, exceto quando expressamente proibido em cláusula apartada.\n\nNenhuma das partes poderá utilizar a marca, logotipo ou identidade visual da outra para fins comerciais sem autorização prévia e por escrito.`,
  },

  // RESCISÃO
  {
    id: "resc-001",
    title: "Rescisão por Mútuo Acordo",
    category: "rescisao",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `Este contrato poderá ser rescindido a qualquer momento por mútuo acordo entre as partes, mediante comunicação por escrito com antecedência mínima de 15 (quinze) dias.\n\nNa hipótese de rescisão amigável, serão devidos os valores proporcionais ao trabalho já executado até a data da rescisão.`,
  },
  {
    id: "resc-002",
    title: "Rescisão por Inadimplência",
    category: "rescisao",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    content: `O descumprimento de qualquer obrigação prevista neste contrato, incluindo o atraso no pagamento por período superior a 30 (trinta) dias, confere à parte prejudicada o direito de rescindir o contrato, com ou sem justa causa.\n\nA rescisão por inadimplência do(a) CONTRATANTE não exime o mesmo do pagamento dos valores devidos pelo serviço já executado, acrescidos de multa conforme previsto neste instrumento.`,
  },

  // RESPONSABILIDADES
  {
    id: "resp-001",
    title: "Responsabilidades do Contratado",
    category: "responsabilidades",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `O(A) CONTRATADO(A) compromete-se a:\n\n- Executar os serviços com qualidade, dentro dos prazos estabelecidos;\n- Manter sigilo sobre informações do(a) CONTRATANTE;\n- Comunicar imediatamente qualquer impedimento na execução dos serviços;\n- Realizar as revisões acordadas neste contrato.`,
  },
  {
    id: "resp-002",
    title: "Responsabilidades do Contratante",
    category: "responsabilidades",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `O(A) CONTRATANTE compromete-se a:\n\n- Fornecer todas as informações, materiais e aprovações necessárias nos prazos acordados;\n- Efetuar os pagamentos nas datas estabelecidas;\n- Comunicar por escrito qualquer solicitação de alteração no escopo dos serviços;\n- Designar um responsável para acompanhamento do projeto.`,
  },
  {
    id: "resp-003",
    title: "Responsabilidade Profissional",
    category: "responsabilidades",
    tags: ["saude","juridico","estetica"],
    content: `O(A) CONTRATADO(A) é legalmente habilitado(a) para a prestação dos serviços objeto deste contrato e assume integral responsabilidade técnica sobre os mesmos, nos limites da legislação vigente.\n\nO(A) CONTRATADO(A) não se responsabiliza por resultados que dependam de fatores externos ao seu controle ou que decorram de informações incorretas fornecidas pelo(a) CONTRATANTE.`,
  },
  {
    id: "resp-004",
    title: "Consentimento do Cliente",
    category: "responsabilidades",
    tags: ["saude","estetica"],
    content: `O(A) CONTRATANTE declara ter recebido todas as informações necessárias sobre os procedimentos a serem realizados, incluindo possíveis riscos, contraindicações e resultados esperados.\n\nO(A) CONTRATANTE consente expressamente com a realização dos serviços descritos neste contrato, após esclarecimento completo pelo(a) CONTRATADO(A).`,
  },
  {
    id: "resp-005",
    title: "Resultados Não Garantidos",
    category: "responsabilidades",
    tags: ["marketing","saude","estetica"],
    content: `O(A) CONTRATADO(A) não garante resultados específicos, uma vez que os mesmos dependem de variáveis externas fora do seu controle direto.\n\nO(A) CONTRATADO(A) compromete-se a empenhar seus melhores esforços e técnicas disponíveis para atingir os objetivos acordados, sem, contudo, garantir resultados mensuráveis específicos.`,
  },
  {
    id: "resp-006",
    title: "Suporte Técnico",
    category: "responsabilidades",
    tags: ["web","mobile","software"],
    content: `Após a entrega do projeto, o(a) CONTRATADO(A) prestará suporte técnico gratuito por 30 (trinta) dias, limitado a correção de erros e bugs identificados na versão entregue.\n\nSolicitações de novas funcionalidades, melhorias ou alterações de escopo após a entrega são consideradas novos projetos e serão cobradas separadamente.`,
  },

  // FORO
  {
    id: "foro-001",
    title: "Foro de Eleição",
    category: "foro",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `As partes elegem, de comum acordo, o foro da Comarca onde reside o(a) CONTRATADO(A) como competente para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato, com exclusão de qualquer outro, por mais privilegiado que seja.\n\nAntes de qualquer medida judicial, as partes comprometem-se a buscar solução amigável mediante mediação.`,
  },

  // DISPOSIÇÕES GERAIS
  {
    id: "disp-001",
    title: "Disposições Finais",
    category: "disposicoes_gerais",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    isDefault: true,
    content: `Este contrato representa o acordo integral entre as partes e substitui todos os entendimentos anteriores, escritos ou verbais, sobre o objeto aqui descrito.\n\nQualquer alteração ao presente contrato somente será válida se feita por escrito e assinada por ambas as partes.\n\nA tolerância de qualquer das partes com o descumprimento de qualquer cláusula não implicará novação ou renúncia ao direito de exigi-la em momento posterior.`,
  },
  {
    id: "disp-002",
    title: "Comunicações",
    category: "disposicoes_gerais",
    tags: ["web","branding","mobile","software","design","marketing","juridico","saude","educacao","eventos","estetica","fotografia"],
    content: `Todas as comunicações entre as partes relativas a este contrato deverão ser realizadas por escrito, preferencialmente por e-mail, com confirmação de recebimento.\n\nAs notificações serão consideradas entregues no momento da confirmação de leitura ou após 48 horas do envio, o que ocorrer primeiro.`,
  },
  {
    id: "disp-003",
    title: "Entrega de Conteúdo Educacional",
    category: "especifica",
    tags: ["educacao"],
    content: `O conteúdo educacional será entregue conforme cronograma acordado entre as partes, respeitando os prazos de produção e revisão estabelecidos neste contrato.\n\nO(A) CONTRATANTE terá o direito de uso do material para os fins previstos neste contrato, sendo vedada a reprodução, distribuição ou comercialização sem autorização expressa do(a) CONTRATADO(A).`,
  },
  {
    id: "disp-004",
    title: "Estratégia de Marketing",
    category: "especifica",
    tags: ["marketing"],
    content: `A estratégia de marketing desenvolvida é de propriedade intelectual do(a) CONTRATADO(A) até o pagamento integral dos serviços, quando será transferida ao(à) CONTRATANTE.\n\nO(A) CONTRATANTE é responsável pela aprovação prévia de todos os materiais antes de sua publicação, não cabendo ao(à) CONTRATADO(A) responsabilidade por publicações realizadas sem aprovação formal.`,
  },
  {
    id: "disp-005",
    title: "Entrega de Fotos — Fotografia",
    category: "especifica",
    tags: ["fotografia","eventos"],
    content: `As fotografias serão entregues em formato digital de alta resolução, via link de download, em até 30 (trinta) dias úteis após a realização do serviço.\n\nO(A) CONTRATANTE receberá {{quantidade_fotos}} fotos editadas, selecionadas pelo(a) CONTRATADO(A) dentre as melhores tomadas da sessão.\n\nSeleções adicionais e edições extra serão cobradas conforme tabela de valores vigente.`,
  },
  {
    id: "disp-006",
    title: "Limitação de Responsabilidade",
    category: "responsabilidades",
    tags: ["juridico","software","web","mobile"],
    content: `A responsabilidade total do(a) CONTRATADO(A) por quaisquer danos decorrentes da execução deste contrato fica limitada ao valor total pago pelo(a) CONTRATANTE até a data do evento causador do dano.\n\nO(A) CONTRATADO(A) não será responsável por danos indiretos, consequenciais, lucros cessantes ou perda de oportunidade de negócio.`,
  },
];

// Suggested clauses by profession
export const PROFESSION_SUGGESTIONS: Record<Profession, string[]> = {
  web: ["pi-001", "pi-002", "resp-006", "disp-006", "prazo-003"],
  mobile: ["pi-001", "pi-002", "resp-006", "disp-006", "prazo-003"],
  software: ["pi-001", "pi-002", "resp-006", "conf-002", "disp-006"],
  design: ["pi-003", "prazo-002", "prazo-003", "pi-005"],
  branding: ["pi-003", "pi-005", "prazo-002", "prazo-003"],
  marketing: ["resp-005", "disp-004", "pi-005", "pag-004"],
  fotografia: ["pi-004", "multa-003", "prazo-002", "disp-005"],
  eventos: ["multa-003", "pi-004", "prazo-002", "disp-005"],
  estetica: ["resp-003", "resp-004", "resp-005"],
  saude: ["resp-003", "resp-004", "resp-005", "conf-002"],
  educacao: ["disp-003", "pi-001"],
  juridico: ["conf-002", "disp-006", "resp-003"],
};

export const PROFESSIONS: { id: Profession; label: string; icon: string; color: string }[] = [
  { id: "web", label: "Web", icon: "🌐", color: "from-blue-500/20 to-blue-500/5" },
  { id: "branding", label: "Branding", icon: "✦", color: "from-purple-500/20 to-purple-500/5" },
  { id: "mobile", label: "Mobile", icon: "📱", color: "from-cyan-500/20 to-cyan-500/5" },
  { id: "software", label: "Software", icon: "⌨️", color: "from-green-500/20 to-green-500/5" },
  { id: "design", label: "Design", icon: "◈", color: "from-pink-500/20 to-pink-500/5" },
  { id: "marketing", label: "Marketing", icon: "📈", color: "from-orange-500/20 to-orange-500/5" },
  { id: "juridico", label: "Jurídico", icon: "⚖", color: "from-yellow-500/20 to-yellow-500/5" },
  { id: "saude", label: "Saúde", icon: "♥", color: "from-red-500/20 to-red-500/5" },
  { id: "educacao", label: "Educação", icon: "◎", color: "from-indigo-500/20 to-indigo-500/5" },
  { id: "eventos", label: "Eventos", icon: "◆", color: "from-amber-500/20 to-amber-500/5" },
  { id: "estetica", label: "Estética", icon: "✿", color: "from-rose-500/20 to-rose-500/5" },
  { id: "fotografia", label: "Fotografia", icon: "◉", color: "from-slate-400/20 to-slate-400/5" },
];

export function getDefaultClauses(): Clause[] {
  return CLAUSES.filter((c) => c.isDefault);
}

export function getSuggestedClauses(profession: Profession): Clause[] {
  const ids = PROFESSION_SUGGESTIONS[profession] ?? [];
  return CLAUSES.filter((c) => ids.includes(c.id));
}

export function replaceVariables(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
