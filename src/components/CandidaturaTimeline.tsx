import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  MessageSquare,
  ArrowRightLeft,
  UserPlus,
  Sparkles,
  Mail,
  StickyNote,
  Tag,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CandidaturaEvento {
  id: string;
  candidatura_id: string;
  tipo: string;
  descricao: string | null;
  ator_id: string | null;
  ator_nome: string | null;
  dados: Record<string, unknown>;
  created_at: string;
}

interface CandidaturaTimelineProps {
  candidaturaId: string;
  className?: string;
}

const TIPO_META: Record<
  string,
  { label: string; icon: typeof Activity; color: string }
> = {
  candidatou_se: {
    label: "Candidatura recebida",
    icon: UserPlus,
    color: "text-gold",
  },
  mudou_estagio: {
    label: "Mudança de estágio",
    icon: ArrowRightLeft,
    color: "text-senior",
  },
  nota: { label: "Nota interna", icon: StickyNote, color: "text-pleno" },
  comentario: { label: "Comentário", icon: MessageSquare, color: "text-pleno" },
  avaliacao_ia: {
    label: "Avaliação da IA",
    icon: Sparkles,
    color: "text-gold",
  },
  email: { label: "E-mail enviado", icon: Mail, color: "text-senior" },
  tag: { label: "Tag atualizada", icon: Tag, color: "text-junior" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const CandidaturaTimeline = ({
  candidaturaId,
  className,
}: CandidaturaTimelineProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CandidaturaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!candidaturaId) return;
    void load();

    const channel = supabase
      .channel(`timeline-${candidaturaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "candidatura_eventos",
          filter: `candidatura_id=eq.${candidaturaId}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as CandidaturaEvento, ...prev]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidaturaId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidatura_eventos")
      .select("*")
      .eq("candidatura_id", candidaturaId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar histórico");
    } else {
      setEvents((data ?? []) as CandidaturaEvento[]);
    }
    setLoading(false);
  };

  const addNota = async () => {
    const text = nota.trim();
    if (!text) return;
    setPosting(true);
    const atorNome =
      (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
      user?.email ??
      null;
    const { error } = await supabase.from("candidatura_eventos").insert({
      candidatura_id: candidaturaId,
      tipo: "nota",
      descricao: text,
      ator_id: user?.id ?? null,
      ator_nome: atorNome,
      dados: {},
    });
    if (error) {
      toast.error("Não foi possível salvar a nota");
    } else {
      setNota("");
      toast.success("Nota adicionada");
    }
    setPosting(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Adicionar nota interna sobre o candidato..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={addNota}
            disabled={posting || !nota.trim()}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <StickyNote className="h-4 w-4 mr-2" />
            )}
            Adicionar nota
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
          Nenhum evento registrado ainda.
        </div>
      ) : (
        <ol className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-border">
          {events.map((ev) => {
            const meta = TIPO_META[ev.tipo] ?? {
              label: ev.tipo,
              icon: Activity,
              color: "text-muted-foreground",
            };
            const Icon = meta.icon;
            return (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[22px] top-1 h-4 w-4 rounded-full bg-surface-elevated border border-sidebar-border flex items-center justify-center",
                  )}
                >
                  <Icon className={cn("h-2.5 w-2.5", meta.color)} />
                </span>
                <div className="surface-card rounded-lg p-3 border border-sidebar-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                      </div>
                      {ev.descricao && (
                        <div className="text-sm text-body mt-0.5 whitespace-pre-line">
                          {ev.descricao}
                        </div>
                      )}
                      {ev.ator_nome && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          por {ev.ator_nome}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {fmtDate(ev.created_at)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
