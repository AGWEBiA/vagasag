import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useBranding } from "@/hooks/useBranding";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Briefcase,
  Layers,
  Inbox,
  Calendar,
  Cpu,
  Mail,
  Users2,
  Sparkles,
  Search,
  Download,
} from "lucide-react";

interface Topico {
  q: string;
  a: React.ReactNode;
}

interface Secao {
  id: string;
  titulo: string;
  icone: typeof HelpCircle;
  resumo: string;
  topicos: Topico[];
}

const SECOES: Secao[] = [
  {
    id: "vagas",
    titulo: "Vagas",
    icone: Briefcase,
    resumo: "Criar, editar e configurar perguntas das vagas.",
    topicos: [
      {
        q: "Como criar uma vaga?",
        a: (
          <>
            Vá em <strong>Vagas</strong> no menu lateral e clique em{" "}
            <strong>Nova vaga</strong>. Preencha título, cargo, modalidade e
            descrição (mín. 20 caracteres). No mesmo formulário, role até{" "}
            <em>Perguntas para o candidato</em> para adicionar perguntas do banco
            ou customizadas antes de salvar.
          </>
        ),
      },
      {
        q: "Onde ficam as perguntas específicas vs. genéricas?",
        a: (
          <>
            Ao abrir o picker <strong>Do banco</strong>, as perguntas aparecem
            agrupadas em <strong>Específicas do cargo</strong>,{" "}
            <strong>Genéricas</strong> (sem cargo associado) e{" "}
            <strong>Sugeridas para outros cargos</strong> (visível com o filtro
            desligado).
          </>
        ),
      },
      {
        q: "O que é o pacote comportamental?",
        a: (
          <>
            Conjunto de perguntas situacionais para avaliar perfil, proatividade
            e trabalho em equipe. Clique em <strong>Pacote comportamental</strong>{" "}
            no editor de perguntas — abre um modal de revisão onde você
            seleciona, edita ou remove cada uma antes de adicionar.
          </>
        ),
      },
    ],
  },
  {
    id: "pipeline",
    titulo: "Pipeline (Kanban)",
    icone: Layers,
    resumo: "Mover candidatos entre estágios e configurar automações.",
    topicos: [
      {
        q: "Como abro o Kanban de uma vaga?",
        a: (
          <>
            <strong>3 caminhos:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Em <strong>Vagas</strong>, clique em <em>Abrir Kanban</em> no card
                da vaga.
              </li>
              <li>
                Use o atalho global <strong>Kanban</strong> no topo do app e
                escolha a vaga.
              </li>
              <li>
                URL direta:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  /vagas-admin/&#123;id&#125;/pipeline
                </code>
                .
              </li>
            </ul>
          </>
        ),
      },
      {
        q: "Como configuro os estágios (colunas)?",
        a: (
          <>
            Em <Link to="/admin/pipeline" className="text-gold underline">Admin → Pipeline</Link>{" "}
            você cria/ordena colunas. Cada estágio tem cor, tipo (inicial,
            intermediário, final aprovado/reprovado) e dois interruptores
            poderosos: <strong>auto-score IA</strong> (avalia ao chegar nessa
            coluna) e <strong>e-mail automático</strong> (dispara template ao
            candidato).
          </>
        ),
      },
      {
        q: "O que acontece quando arrasto um card?",
        a: (
          <>
            Triggers no banco registram o evento na <strong>timeline</strong>{" "}
            da candidatura, atualizam a data do estágio e — se a coluna estiver
            configurada — disparam IA e/ou e-mail automaticamente.
          </>
        ),
      },
    ],
  },
  {
    id: "candidaturas",
    titulo: "Candidaturas",
    icone: Inbox,
    resumo: "Inbox, notas, atribuições e timeline.",
    topicos: [
      {
        q: "Onde vejo todas as candidaturas de uma vaga?",
        a: (
          <>
            No card da vaga, clique no contador (
            <Inbox className="inline h-3.5 w-3.5" />) ou acesse{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              /admin/candidaturas/&#123;vagaId&#125;
            </code>
            .
          </>
        ),
      },
      {
        q: "Como atribuir um recrutador?",
        a: <>Abra o card da candidatura e use o seletor <strong>Atribuir</strong>. A mudança fica registrada na timeline.</>,
      },
      {
        q: "Como funciona @menção em notas?",
        a: <>Digite <strong>@</strong> dentro de uma nota interna para mencionar um colega — ele verá no histórico.</>,
      },
    ],
  },
  {
    id: "entrevistas",
    titulo: "Entrevistas",
    icone: Calendar,
    resumo: "Agendar, enviar convite .ics e lembretes.",
    topicos: [
      {
        q: "Como agendo uma entrevista?",
        a: (
          <>
            Dentro do card da candidatura, abra a aba <strong>Entrevistas</strong>{" "}
            e clique em <em>Agendar</em>. Defina modalidade (online/presencial/
            telefone), data, link ou local, entrevistador e fuso. O sistema
            envia convite com <code>.ics</code> e (opcional) lembrete X horas
            antes.
          </>
        ),
      },
      {
        q: "O candidato cancelou — o que fazer?",
        a: <>Mude o status para <strong>cancelada</strong> ou <strong>remarcada</strong>. A alteração também entra na timeline.</>,
      },
    ],
  },
  {
    id: "ia",
    titulo: "Avaliação por IA & Pesos",
    icone: Cpu,
    resumo: "Como a IA pontua e onde ajustar os pesos dos pilares.",
    topicos: [
      {
        q: "Quais são os pilares avaliados?",
        a: (
          <>
            <strong>Técnico, Impacto, Comportamental, Estratégico</strong> e{" "}
            <strong>Liderança</strong>. Cada um recebe nota 0–100 e é
            ponderado pelos pesos globais. O resultado vai para o relatório do
            candidato com pontos fortes, gaps, evidências comportamentais e
            perguntas sugeridas para entrevista.
          </>
        ),
      },
      {
        q: "Como ajusto os pesos?",
        a: (
          <>
            Em <Link to="/admin/ia" className="text-gold underline">Admin → Configuração de IA</Link>,
            seção <strong>Pesos dos pilares</strong>. Os 5 valores precisam somar
            100%. Mudanças recalculam o score ponderado em tempo real nos
            relatórios.
          </>
        ),
      },
      {
        q: "O que são evidências comportamentais?",
        a: <>Trechos das respostas do candidato citados pela IA, ligados a traços observados (ex: proatividade, resiliência) e o impacto que tiveram no score do pilar Comportamental.</>,
      },
    ],
  },
  {
    id: "emails",
    titulo: "E-mails",
    icone: Mail,
    resumo: "Templates por estágio, fila de envio e descadastros.",
    topicos: [
      {
        q: "Como personalizar o e-mail de cada estágio?",
        a: <>Em <Link to="/admin/pipeline" className="text-gold underline">Admin → Pipeline</Link>, abra o estágio, ative <strong>E-mail automático</strong> e edite assunto e corpo (com variáveis como nome, vaga, etc.).</>,
      },
      {
        q: "O candidato pediu para parar de receber e-mails",
        a: <>Todo e-mail tem link de unsubscribe. O endereço entra na lista de <code>suppressed_emails</code> e o sistema deixa de enviar automaticamente.</>,
      },
    ],
  },
  {
    id: "talentos",
    titulo: "Banco de Talentos",
    icone: Users2,
    resumo: "Reaproveitar candidatos em vagas futuras.",
    topicos: [
      {
        q: "Quem aparece no Banco de Talentos?",
        a: <>Candidatos com <code>talent_status</code> diferente de descartado, que já passaram por algum processo. Útil para recrutamento ativo em novas vagas.</>,
      },
    ],
  },
];

const Ajuda = () => {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return SECOES;
    return SECOES.map((s) => ({
      ...s,
      topicos: s.topicos.filter(
        (t) =>
          t.q.toLowerCase().includes(q) ||
          (typeof t.a === "string" && t.a.toLowerCase().includes(q)),
      ),
    })).filter((s) => s.topicos.length > 0 || s.titulo.toLowerCase().includes(q));
  }, [busca]);

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
          <HelpCircle className="h-3 w-3" /> Central de Ajuda
        </div>
        <h1 className="font-display text-4xl font-semibold">Como usar o sistema</h1>
        <p className="text-muted-foreground mt-1">
          Guia rápido para vagas, pipeline, candidaturas, entrevistas e IA.
        </p>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Sumário */}
        <aside className="hidden lg:block">
          <div className="surface-card rounded-xl p-4 sticky top-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Tópicos
            </div>
            <nav className="flex flex-col gap-1">
              {SECOES.map(({ id, titulo, icone: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-sidebar-accent hover:text-gold transition"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {titulo}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-6 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar na ajuda…"
              className="pl-9"
            />
          </div>

          {/* Atalhos rápidos */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              to="/vagas-admin"
              className="surface-card rounded-xl p-4 hover:ring-1 hover:ring-gold/30 transition flex items-start gap-3"
            >
              <Briefcase className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <div className="font-display font-semibold text-sm">Ir para Vagas</div>
                <div className="text-xs text-muted-foreground">
                  Criar vaga, abrir Kanban, ver candidaturas.
                </div>
              </div>
            </Link>
            <Link
              to="/admin/pipeline"
              className="surface-card rounded-xl p-4 hover:ring-1 hover:ring-gold/30 transition flex items-start gap-3"
            >
              <Layers className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <div className="font-display font-semibold text-sm">
                  Configurar estágios
                </div>
                <div className="text-xs text-muted-foreground">
                  Cores, ordem, auto-score IA e e-mails.
                </div>
              </div>
            </Link>
            <Link
              to="/admin/ia"
              className="surface-card rounded-xl p-4 hover:ring-1 hover:ring-gold/30 transition flex items-start gap-3"
            >
              <Sparkles className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <div className="font-display font-semibold text-sm">Pesos dos pilares</div>
                <div className="text-xs text-muted-foreground">
                  Ajuste como a IA pondera o score final.
                </div>
              </div>
            </Link>
            <Link
              to="/banco-talentos"
              className="surface-card rounded-xl p-4 hover:ring-1 hover:ring-gold/30 transition flex items-start gap-3"
            >
              <Users2 className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <div className="font-display font-semibold text-sm">Banco de Talentos</div>
                <div className="text-xs text-muted-foreground">
                  Reaproveitar candidatos em novas vagas.
                </div>
              </div>
            </Link>
          </div>

          {filtradas.length === 0 ? (
            <div className="surface-card rounded-xl p-10 text-center text-sm text-muted-foreground">
              Nenhum resultado para “{busca}”.
            </div>
          ) : (
            filtradas.map(({ id, titulo, icone: Icon, resumo, topicos }) => (
              <section
                key={id}
                id={id}
                className="surface-card rounded-xl p-5 scroll-mt-20"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pleno-bg border border-gold/30">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">{titulo}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-3 ml-11">{resumo}</p>
                <Accordion type="multiple" className="w-full">
                  {topicos.map((t, i) => (
                    <AccordionItem key={i} value={`${id}-${i}`}>
                      <AccordionTrigger className="text-left text-sm font-medium">
                        {t.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-body leading-relaxed">
                        {t.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Ajuda;
