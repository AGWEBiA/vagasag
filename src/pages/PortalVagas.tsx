import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Gem, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_LABEL } from "@/lib/seniority";
import { Button } from "@/components/ui/button";

interface VagaListItem {
  id: string;
  titulo: string;
  cargo: string;
  descricao: string;
  modalidade: string;
  localizacao: string | null;
  faixa_salarial: string | null;
  created_at: string;
}

const PortalVagas = () => {
  const [vagas, setVagas] = useState<VagaListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Vagas Abertas | Seniority Hub";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vagas")
      .select("id,titulo,cargo,descricao,modalidade,localizacao,faixa_salarial,created_at")
      .eq("status", "aberta")
      .order("created_at", { ascending: false });
    setVagas((data ?? []) as VagaListItem[]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-sidebar-border bg-sidebar/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
              <Gem className="h-5 w-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-tight">
                Seniority <span className="text-gradient-gold">Hub</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Talent Intelligence
              </div>
            </div>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Área do recrutador</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-4 border border-gold/30">
            <Briefcase className="h-3 w-3" /> Vagas Abertas
          </div>
          <h1 className="font-display text-5xl font-semibold mb-3">
            Encontre sua próxima <span className="text-gradient-gold">oportunidade</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Inscreva-se nas vagas abertas. Sua candidatura será analisada por nossa equipe e por uma IA
            especialista em senioridade.
          </p>
        </section>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando vagas...</div>
        ) : vagas.length === 0 ? (
          <div className="surface-card rounded-xl p-12 text-center max-w-xl mx-auto">
            <Briefcase className="h-10 w-10 text-gold mx-auto mb-3" />
            <h3 className="font-display text-xl font-semibold mb-1">
              Nenhuma vaga aberta no momento
            </h3>
            <p className="text-sm text-muted-foreground">
              Volte em breve — novas oportunidades surgem com frequência.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vagas.map((v) => (
              <Link
                key={v.id}
                to={`/vagas/${v.id}`}
                className="surface-card rounded-xl p-6 flex flex-col gap-3 hover:ring-1 hover:ring-gold/40 hover:shadow-gold transition group"
              >
                <div className="text-xs text-gold uppercase tracking-widest font-semibold">
                  {CARGO_LABEL[v.cargo]}
                </div>
                <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-gold transition">
                  {v.titulo}
                </h3>
                <p className="text-sm text-body/80 line-clamp-3">{v.descricao}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-auto pt-3 border-t border-sidebar-border">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {v.modalidade}
                    {v.localizacao ? ` · ${v.localizacao}` : ""}
                  </span>
                  {v.faixa_salarial && (
                    <span className="text-gold">{v.faixa_salarial}</span>
                  )}
                </div>
                <div className="inline-flex items-center text-xs font-medium text-gold gap-1">
                  Ver vaga e candidatar-se <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-sidebar-border mt-20 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Seniority Hub · Talent Intelligence
      </footer>
    </div>
  );
};

export default PortalVagas;
