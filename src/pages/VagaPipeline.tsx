import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Inbox,
  Layers,
  List,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_LABEL } from "@/lib/seniority";
import { toast } from "sonner";
import { diffDays, type PipelineEstagio } from "@/lib/pipeline";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

interface Vaga {
  id: string;
  titulo: string;
  cargo: string;
}

interface Candidatura {
  id: string;
  nome: string;
  email: string;
  estagio_id: string | null;
  estagio_atualizado_em: string;
  candidate_id: string | null;
  tags: string[];
  created_at: string;
  status: string;
}

const VagaPipeline = () => {
  const { vagaId } = useParams<{ vagaId: string }>();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [estagios, setEstagios] = useState<PipelineEstagio[]>([]);
  const [items, setItems] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    document.title = "Pipeline da Vaga | Seniority Hub";
    void load();
  }, [vagaId]);

  const load = async () => {
    if (!vagaId) return;
    setLoading(true);
    const [{ data: v }, { data: es }, { data: cs }] = await Promise.all([
      supabase
        .from("vagas")
        .select("id,titulo,cargo")
        .eq("id", vagaId)
        .maybeSingle(),
      supabase
        .from("pipeline_estagios")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
      supabase
        .from("candidaturas")
        .select(
          "id, nome, email, estagio_id, estagio_atualizado_em, candidate_id, tags, created_at, status",
        )
        .eq("vaga_id", vagaId)
        .order("created_at", { ascending: false }),
    ]);
    setVaga(v as Vaga | null);
    setEstagios((es ?? []) as PipelineEstagio[]);
    setItems((cs ?? []) as Candidatura[]);
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const map: Record<string, Candidatura[]> = {};
    for (const e of estagios) map[e.id] = [];
    for (const c of items) {
      if (c.estagio_id && map[c.estagio_id]) map[c.estagio_id].push(c);
    }
    return map;
  }, [estagios, items]);

  const semEstagio = useMemo(
    () => items.filter((c) => !c.estagio_id),
    [items],
  );

  const onDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const candidaturaId = String(e.active.id);
    const estagioId = String(e.over.id);
    const cand = items.find((c) => c.id === candidaturaId);
    if (!cand || cand.estagio_id === estagioId) return;

    // Otimismo
    setItems((prev) =>
      prev.map((c) =>
        c.id === candidaturaId
          ? { ...c, estagio_id: estagioId, estagio_atualizado_em: new Date().toISOString() }
          : c,
      ),
    );
    const { error } = await supabase
      .from("candidaturas")
      .update({ estagio_id: estagioId })
      .eq("id", candidaturaId);
    if (error) {
      toast.error("Não foi possível mover");
      void load();
    } else {
      const novo = estagios.find((s) => s.id === estagioId)?.nome;
      toast.success(`Movido para "${novo}"`);
    }
  };

  const dragging = items.find((c) => c.id === draggingId) ?? null;

  return (
    <AppShell>
      <header className="mb-6 animate-fade-in flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/vagas-admin">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para vagas
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-2 border border-gold/30">
            <Layers className="h-3 w-3" /> Pipeline
          </div>
          <h1 className="font-display text-3xl font-semibold">
            {vaga?.titulo ?? "Carregando..."}
          </h1>
          {vaga && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {CARGO_LABEL[vaga.cargo]} · {items.length} candidatura(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/admin/candidaturas/${vagaId}`}>
              <List className="h-4 w-4 mr-2" /> Visão lista
            </Link>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center">
          <Inbox className="h-10 w-10 text-gold mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold mb-1">
            Nenhuma candidatura ainda
          </h3>
          <p className="text-sm text-muted-foreground">
            Compartilhe o link público da vaga para começar a receber inscrições.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {estagios.map((e) => (
              <Coluna
                key={e.id}
                estagio={e}
                cards={grouped[e.id] ?? []}
                onCardClick={(id) =>
                  navigate(`/admin/candidaturas/${vagaId}?cand=${id}`)
                }
              />
            ))}
            {semEstagio.length > 0 && (
              <div className="shrink-0 w-72">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Sem estágio ({semEstagio.length})
                </div>
                <div className="space-y-2">
                  {semEstagio.map((c) => (
                    <CardEstatico key={c.id} cand={c} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {dragging ? <CardEstatico cand={dragging} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </AppShell>
  );
};

const Coluna = ({
  estagio,
  cards,
  onCardClick,
}: {
  estagio: PipelineEstagio;
  cards: Candidatura[];
  onCardClick: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: estagio.id });
  return (
    <div className="shrink-0 w-72 flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: estagio.cor }}
        />
        <span className="font-medium text-sm">{estagio.nome}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[300px] rounded-lg p-2 space-y-2 transition border ${
          isOver
            ? "border-gold/60 bg-gold/5"
            : "border-sidebar-border bg-surface-elevated/50"
        }`}
      >
        {cards.map((c) => (
          <CardArrastavel key={c.id} cand={c} onClick={() => onCardClick(c.id)} />
        ))}
        {cards.length === 0 && (
          <div className="text-[11px] text-center text-muted-foreground py-6">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
};

const CardArrastavel = ({
  cand,
  onClick,
}: {
  cand: Candidatura;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cand.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`surface-card rounded-md p-3 cursor-grab active:cursor-grabbing border border-transparent hover:border-gold/30 transition ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <CardConteudo cand={cand} />
    </div>
  );
};

const CardEstatico = ({
  cand,
  dragging,
}: {
  cand: Candidatura;
  dragging?: boolean;
}) => (
  <div
    className={`surface-card rounded-md p-3 border ${
      dragging ? "border-gold/60 shadow-gold rotate-2" : "border-sidebar-border"
    }`}
  >
    <CardConteudo cand={cand} />
  </div>
);

const CardConteudo = ({ cand }: { cand: Candidatura }) => (
  <>
    <div className="flex items-start justify-between gap-2">
      <div className="font-medium text-sm truncate">{cand.nome}</div>
      {cand.candidate_id && (
        <Sparkles className="h-3 w-3 text-gold shrink-0" />
      )}
    </div>
    <div className="text-[11px] text-muted-foreground truncate">
      {cand.email}
    </div>
    {cand.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {cand.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-[9px] px-1.5 py-0.5 rounded bg-pleno-bg text-gold border border-gold/30 uppercase tracking-wider"
          >
            {t}
          </span>
        ))}
      </div>
    )}
    <div className="text-[10px] text-muted-foreground mt-2">
      {diffDays(cand.estagio_atualizado_em)}d neste estágio
    </div>
  </>
);

export default VagaPipeline;
