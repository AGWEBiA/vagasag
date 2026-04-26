export const CARGOS = [
  { value: "gestor_trafego", label: "Gestor de Tráfego" },
  { value: "copywriter", label: "Copywriter" },
  { value: "designer", label: "Designer" },
  { value: "web_designer", label: "Web Designer" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "social_media_manager", label: "Social Media Manager" },
  { value: "seo_specialist", label: "SEO Specialist" },
  { value: "atendimento_suporte", label: "Atendimento / Suporte" },
  { value: "inside_sales", label: "Inside Sales" },
  { value: "gestor_projetos", label: "Gestor de Projetos" },
] as const;

export type CargoValue = (typeof CARGOS)[number]["value"];

export const CARGO_LABEL: Record<string, string> = Object.fromEntries(
  CARGOS.map((c) => [c.value, c.label]),
);

export const CARGO_HINTS: Record<string, string> = {
  gestor_trafego:
    "Inclua: plataformas utilizadas (Meta Ads, Google Ads), orçamentos gerenciados (R$/mês), ROAS/CPA médio, número de contas, certificações e conquistas mensuráveis.",
  copywriter:
    "Inclua: tipos de copy produzidos (landing pages, e-mails, roteiros), métricas de conversão, projetos de lançamento, ferramentas e domínio de gatilhos mentais.",
  designer:
    "Inclua: ferramentas dominadas (Figma, Adobe), tipos de projeto (identidade visual, UI/UX, motion), portfólio, nível de autonomia e experiência com Design System.",
  web_designer:
    "Inclua: ferramentas (Webflow, Figma, WordPress), projetos de sites/landing pages, foco em conversão, conhecimento de SEO técnico e métricas de performance.",
  desenvolvedor:
    "Inclua: stack tecnológica, projetos desenvolvidos, linguagens e frameworks, experiência com APIs, testes, arquitetura e trabalho em equipe.",
  social_media_manager:
    "Inclua: plataformas gerenciadas, métricas de engajamento, estratégias de conteúdo, gestão de comunidade, campanhas e resultados mensuráveis.",
  seo_specialist:
    "Inclua: ferramentas (SEMrush, Ahrefs, GSC), tipos de SEO (on-page, técnico, off-page), resultados de posicionamento, auditorias realizadas e estratégias de link building.",
  atendimento_suporte:
    "Inclua: experiência com atendimento em lançamentos, ferramentas (CRM, helpdesk), volume de tickets, métricas de satisfação e atuação em períodos de alto volume.",
  inside_sales:
    "Inclua: experiência com vendas High Ticket, métodos de vendas, record de vendas, cursos realizados, projetos/lançamentos atendidos e habilidade em ligações.",
  gestor_projetos:
    "Inclua: metodologias (Agile, Scrum, Kanban), ferramentas (Asana, ClickUp, Notion), tipos de projetos gerenciados, equipes lideradas e métricas de entrega.",
};

export type Senioridade = "Junior" | "Pleno" | "Senior";

export const SENIORIDADE_DESC: Record<Senioridade, string> = {
  Junior:
    "Profissional em desenvolvimento, necessita de supervisão e orientação constante.",
  Pleno:
    "Profissional autônomo, executa com qualidade e começa a liderar iniciativas.",
  Senior:
    "Profissional estratégico, lidera equipes e impacta o negócio de forma estrutural.",
};

export const SENIORIDADE_LABEL: Record<Senioridade, string> = {
  Junior: "Júnior",
  Pleno: "Pleno",
  Senior: "Sênior",
};

export const PILARES = [
  {
    key: "profundidadeTecnica",
    label: "Profundidade Técnica",
    weight: 35,
    icon: "BarChart3",
  },
  { key: "escopoImpacto", label: "Escopo de Impacto", weight: 30, icon: "TrendingUp" },
  { key: "visaoEstrategica", label: "Visão Estratégica", weight: 20, icon: "Target" },
  { key: "liderancaAutonomia", label: "Liderança e Autonomia", weight: 15, icon: "Users" },
] as const;

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function confidenceColorClass(score: number): string {
  if (score >= 80) return "bg-senior";
  if (score >= 60) return "bg-gold";
  return "bg-junior";
}

export function senioridadeBadgeClasses(s: Senioridade): string {
  if (s === "Junior") return "bg-junior-bg text-junior border-junior/40";
  if (s === "Pleno") return "bg-pleno-bg text-gold border-gold/40";
  return "bg-senior-bg text-senior border-senior/40";
}

export function senioridadeAvatarClasses(s: Senioridade): string {
  if (s === "Junior") return "bg-junior-bg text-junior";
  if (s === "Pleno") return "bg-pleno-bg text-gold";
  return "bg-senior-bg text-senior";
}
