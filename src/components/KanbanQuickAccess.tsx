import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_LABEL } from "@/lib/seniority";

interface VagaLite {
  id: string;
  titulo: string;
  cargo: string;
  status: string;
}

/**
 * Botão fixo no header que abre um modal listando todas as vagas
 * abertas para acesso direto ao Kanban de cada uma.
 */
export const KanbanQuickAccess = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [vagas, setVagas] = useState<VagaLite[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || vagas !== null) return;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("vagas")
        .select("id, titulo, cargo, status")
        .order("created_at", { ascending: false });
      setVagas((data ?? []) as VagaLite[]);
      setLoading(false);
    })();
  }, [open, vagas]);

  const filtradas = (vagas ?? []).filter((v) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      v.titulo.toLowerCase().includes(q) ||
      (CARGO_LABEL[v.cargo] ?? v.cargo).toLowerCase().includes(q)
    );
  });

  const abertas = filtradas.filter((v) => v.status === "aberta");
  const outras = filtradas.filter((v) => v.status !== "aberta");

  const ir = (id: string) => {
    setOpen(false);
    setBusca("");
    navigate(`/vagas-admin/${id}/pipeline`);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-gold/40 hover:text-gold"
      >
        <Layers className="h-4 w-4 mr-1.5" />
        Kanban
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Abrir Kanban de uma vaga
            </DialogTitle>
            <DialogDescription>
              Escolha a vaga para ir direto ao pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar vaga…"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : (vagas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma vaga cadastrada ainda.
            </p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma vaga corresponde a “{busca}”.
            </p>
          ) : (
            <div className="space-y-4 mt-2">
              {abertas.length > 0 && (
                <Group title="Abertas" items={abertas} onPick={ir} accent />
              )}
              {outras.length > 0 && (
                <Group title="Pausadas / encerradas" items={outras} onPick={ir} muted />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const Group = ({
  title,
  items,
  onPick,
  accent,
  muted,
}: {
  title: string;
  items: VagaLite[];
  onPick: (id: string) => void;
  accent?: boolean;
  muted?: boolean;
}) => (
  <div>
    <div
      className={`text-xs uppercase tracking-wider mb-2 ${
        accent ? "text-gold" : "text-muted-foreground"
      }`}
    >
      {title} ({items.length})
    </div>
    <div className="space-y-1.5">
      {items.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onPick(v.id)}
          className={`w-full text-left rounded-md border bg-surface-elevated p-3 hover:border-gold/40 transition ${
            accent ? "border-gold/30" : "border-sidebar-border"
          } ${muted ? "opacity-75" : ""}`}
        >
          <div className="font-medium text-sm">{v.titulo}</div>
          <div className="text-xs text-muted-foreground">
            {CARGO_LABEL[v.cargo] ?? v.cargo} · {v.status}
          </div>
        </button>
      ))}
    </div>
  </div>
);
