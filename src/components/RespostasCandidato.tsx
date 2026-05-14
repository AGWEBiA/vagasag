import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ESCALA_LABEL, type PerguntaTipo } from "@/lib/perguntas";

interface RespostaJoined {
  id: string;
  resposta_texto: string | null;
  resposta_numero: number | null;
  vaga_pergunta_id: string;
  vaga_perguntas: {
    texto: string;
    tipo: PerguntaTipo;
    ordem: number;
    obrigatoria: boolean;
  } | null;
}

interface RespostaRow {
  id: string;
  resposta_texto: string | null;
  resposta_numero: number | null;
  vaga_pergunta_id: string;
}

interface PerguntaRow {
  id: string;
  texto: string;
  tipo: PerguntaTipo;
  ordem: number;
  obrigatoria: boolean;
}

export const RespostasCandidato = ({ candidaturaId }: { candidaturaId: string }) => {
  const [items, setItems] = useState<RespostaJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setError(null);

      const { data: respostas, error: respostasError } = await supabase
        .from("candidatura_respostas")
        .select("id, resposta_texto, resposta_numero, vaga_pergunta_id")
        .eq("candidatura_id", candidaturaId);

      if (cancel) return;

      if (respostasError) {
        console.error("Erro ao carregar respostas do candidato", respostasError);
        setItems([]);
        setError("Não foi possível carregar as respostas do candidato.");
        setLoading(false);
        return;
      }

      const respostaRows = (respostas ?? []) as RespostaRow[];
      const perguntaIds = Array.from(new Set(respostaRows.map((r) => r.vaga_pergunta_id).filter(Boolean)));
      let perguntasMap = new Map<string, PerguntaRow>();

      if (perguntaIds.length > 0) {
        const { data: perguntas, error: perguntasError } = await supabase
          .from("vaga_perguntas")
          .select("id, texto, tipo, ordem, obrigatoria")
          .in("id", perguntaIds);

        if (cancel) return;

        if (perguntasError) {
          console.error("Erro ao carregar perguntas das respostas", perguntasError);
        } else {
          perguntasMap = new Map(((perguntas ?? []) as PerguntaRow[]).map((p) => [p.id, p]));
        }
      }

      const sorted = respostaRows.map((r) => ({
        ...r,
        vaga_perguntas: perguntasMap.get(r.vaga_pergunta_id) ?? null,
      })).sort(
        (a, b) => (a.vaga_perguntas?.ordem ?? 0) - (b.vaga_perguntas?.ordem ?? 0),
      );
      setItems(sorted);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [candidaturaId]);

  if (loading)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gold" />
      </div>
    );

  if (error)
    return (
      <p className="text-xs text-destructive italic">
        {error}
      </p>
    );

  if (items.length === 0)
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhuma resposta enviada.
      </p>
    );

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-md border border-sidebar-border bg-surface-elevated p-3">
          <p className="text-xs uppercase tracking-wider text-gold mb-1">
            {r.vaga_perguntas?.texto ?? "Pergunta removida"}
          </p>
          {r.vaga_perguntas?.tipo === "escala" ? (
            <p className="text-sm">
              <span className="font-display text-lg text-gold">{r.resposta_numero}</span>
              <span className="text-muted-foreground">
                {" / 5"}
                {typeof r.resposta_numero === "number" &&
                  ` · ${ESCALA_LABEL[r.resposta_numero]}`}
              </span>
            </p>
          ) : (
            <p className="text-sm whitespace-pre-line">
              {r.resposta_texto || (
                <span className="text-muted-foreground italic">Sem resposta</span>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
