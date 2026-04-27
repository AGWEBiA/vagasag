import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listTeamMembers, type TeamMember } from "@/lib/team";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AtSign, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Nota {
  id: string;
  candidatura_id: string;
  autor_id: string;
  autor_nome: string | null;
  texto: string;
  mencionados: string[];
  created_at: string;
}

interface Props {
  candidaturaId: string;
}

export const NotasInternas = ({ candidaturaId }: Props) => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void load();
    void listTeamMembers().then(setTeam);
  }, [candidaturaId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidatura_notas")
      .select("*")
      .eq("candidatura_id", candidaturaId)
      .order("created_at", { ascending: false });
    if (!error) setNotas((data ?? []) as Nota[]);
    setLoading(false);
  };

  // Detecta menções ao digitar @
  const handleTextChange = (v: string) => {
    setTexto(v);
    const cursor = taRef.current?.selectionStart ?? v.length;
    const before = v.slice(0, cursor);
    const match = before.match(/@([\w.-]*)$/);
    if (match) {
      setShowMentions(true);
      setMentionFilter(match[1].toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (m: TeamMember) => {
    const cursor = taRef.current?.selectionStart ?? texto.length;
    const before = texto.slice(0, cursor).replace(/@[\w.-]*$/, "");
    const after = texto.slice(cursor);
    const handle = m.email.split("@")[0];
    const next = `${before}@${handle} ${after}`;
    setTexto(next);
    setShowMentions(false);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const filteredMentions = useMemo(() => {
    if (!mentionFilter) return team.slice(0, 6);
    return team
      .filter(
        (m) =>
          m.email.toLowerCase().includes(mentionFilter) ||
          m.nome.toLowerCase().includes(mentionFilter),
      )
      .slice(0, 6);
  }, [team, mentionFilter]);

  // Extrai IDs mencionados (@handle) com base no email do team
  const extractMentionedIds = (txt: string): string[] => {
    const handles = Array.from(txt.matchAll(/@([\w.-]+)/g)).map((m) =>
      m[1].toLowerCase(),
    );
    if (handles.length === 0) return [];
    const ids = new Set<string>();
    team.forEach((m) => {
      const h = m.email.split("@")[0].toLowerCase();
      if (handles.includes(h)) ids.add(m.id);
    });
    return Array.from(ids);
  };

  const submit = async () => {
    if (!user || !texto.trim()) return;
    setSaving(true);
    const mencionados = extractMentionedIds(texto);
    const autorNome = user.user_metadata?.full_name ?? user.email ?? "—";
    const { error } = await supabase.from("candidatura_notas").insert({
      candidatura_id: candidaturaId,
      autor_id: user.id,
      autor_nome: autorNome,
      texto: texto.trim(),
      mencionados,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar nota");
      return;
    }
    setTexto("");
    toast.success(
      mencionados.length > 0
        ? `Nota salva — ${mencionados.length} menção(ões) registrada(s)`
        : "Nota salva",
    );
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("candidatura_notas").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    setNotas((prev) => prev.filter((n) => n.id !== id));
  };

  // Renderiza texto com menções estilizadas
  const renderTexto = (t: string) => {
    const parts = t.split(/(@[\w.-]+)/g);
    return parts.map((p, i) =>
      p.startsWith("@") ? (
        <span key={i} className="text-gold font-medium">
          {p}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          ref={taRef}
          value={texto}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Escreva uma nota interna… use @ para mencionar alguém do time"
          rows={3}
          className="resize-none"
        />
        {showMentions && filteredMentions.length > 0 && (
          <div className="absolute left-2 right-2 mt-1 surface-card rounded-lg border border-gold/30 shadow-card overflow-hidden z-20 max-h-56 overflow-y-auto">
            {filteredMentions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gold/10 text-sm"
              >
                <AtSign className="h-3.5 w-3.5 text-gold shrink-0" />
                <span className="font-medium truncate">{m.email.split("@")[0]}</span>
                <span className="text-xs text-muted-foreground truncate ml-auto">
                  {m.email}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">
            Visível apenas para o time interno
          </span>
          <Button
            size="sm"
            onClick={submit}
            disabled={saving || !texto.trim()}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
            )}
            Adicionar nota
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : notas.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            Nenhuma nota ainda. Comece escrevendo acima.
          </div>
        ) : (
          notas.map((n) => {
            const mine = n.autor_id === user?.id;
            return (
              <article
                key={n.id}
                className={cn(
                  "rounded-lg border p-3 transition",
                  mine
                    ? "border-gold/30 bg-gold/5"
                    : "border-sidebar-border bg-surface-elevated/50",
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{n.autor_nome ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {mine && (
                    <button
                      onClick={() => remove(n.id)}
                      className="text-muted-foreground hover:text-destructive transition"
                      aria-label="Excluir nota"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-body whitespace-pre-line leading-relaxed">
                  {renderTexto(n.texto)}
                </p>
                {n.mencionados.length > 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {n.mencionados.length} pessoa(s) notificada(s)
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
