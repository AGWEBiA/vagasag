import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listTeamMembers, type TeamMember } from "@/lib/team";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Atribuicao {
  recrutador_id: string;
  recrutador_nome: string | null;
}

interface Props {
  candidaturaId: string;
}

const NONE = "__none__";

export const AtribuicaoRecrutador = ({ candidaturaId }: Props) => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [atual, setAtual] = useState<Atribuicao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      listTeamMembers().then(setTeam),
      supabase
        .from("candidatura_atribuicoes")
        .select("recrutador_id, recrutador_nome")
        .eq("candidatura_id", candidaturaId)
        .maybeSingle()
        .then(({ data }) => setAtual((data ?? null) as Atribuicao | null)),
    ]).finally(() => setLoading(false));
  }, [candidaturaId]);

  const setRecrutador = async (recrutadorId: string) => {
    if (!user) return;
    setSaving(true);
    if (recrutadorId === NONE) {
      const { error } = await supabase
        .from("candidatura_atribuicoes")
        .delete()
        .eq("candidatura_id", candidaturaId);
      setSaving(false);
      if (error) {
        toast.error("Não foi possível remover atribuição");
        return;
      }
      setAtual(null);
      toast.success("Atribuição removida");
      return;
    }

    const member = team.find((m) => m.id === recrutadorId);
    const recrutadorNome =
      member?.nome ?? member?.email?.split("@")[0] ?? "Recrutador";

    // Upsert: deletar e inserir (uma única atribuição por candidatura)
    await supabase
      .from("candidatura_atribuicoes")
      .delete()
      .eq("candidatura_id", candidaturaId);

    const { error } = await supabase.from("candidatura_atribuicoes").insert({
      candidatura_id: candidaturaId,
      recrutador_id: recrutadorId,
      recrutador_nome: recrutadorNome,
      atribuido_por: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível atribuir");
      return;
    }
    setAtual({ recrutador_id: recrutadorId, recrutador_nome: recrutadorNome });
    toast.success(`Atribuído a ${recrutadorNome}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UserCheck className="h-4 w-4 text-gold" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Responsável
      </span>
      <Select
        value={atual?.recrutador_id ?? NONE}
        onValueChange={setRecrutador}
        disabled={saving}
      >
        <SelectTrigger className="h-8 w-56">
          <SelectValue placeholder="Sem responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sem responsável</SelectItem>
          {team.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="inline-flex items-center gap-2">
                <span className="font-medium">{m.email.split("@")[0]}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
