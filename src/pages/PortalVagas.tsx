import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_LABEL } from "@/lib/seniority";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/hooks/useBranding";
import { BrandLogo } from "@/components/BrandLogo";
import { slugify, stripHtml } from "@/lib/utils";

interface VagaListItem {
  id: string;
  slug: string;
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
  const branding = useBranding();

  useEffect(() => {
    document.title = `Vagas · ${branding.product_name}`;
    void load();
  }, [branding.product_name]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vagas")
      .select("id,slug,titulo,cargo,descricao,modalidade,localizacao,faixa_salarial,created_at")
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
            {branding.logo_horizontal_url ? (
              <img src={branding.logo_horizontal_url} alt={branding.product_name} className="h-10 w-auto object-contain" />
            ) : (
              <BrandLogo variant="mark" showText />
            )}
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
                to={`/vagas/${v.slug || v.id}`}
                className="surface-card rounded-xl p-4 sm:p-6 flex flex-col gap-3 hover:ring-1 hover:ring-gold/40 hover:shadow-gold transition group"
              >
                <div className="text-xs text-gold uppercase tracking-widest font-semibold">
                  {CARGO_LABEL[v.cargo]}
                </div>
                <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-gold transition">
                  {v.titulo}
                </h3>
                <p className="text-sm text-body/80 line-clamp-3">{stripHtml(v.descricao)}</p>
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

      <footer className="border-t border-sidebar-border mt-20 py-10 text-center text-xs text-muted-foreground relative" id="portal-footer">
        <div className="flex flex-col items-center gap-4">
          <a
            href="https://wa.me/5548996670822"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-[9999] bg-[#25D366] text-white p-3.5 rounded-full shadow-lg hover:bg-[#20ba5a] transition-all hover:scale-110 active:scale-95 group"
            title="Fale conosco no WhatsApp"
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              stroke="currentColor"
              strokeWidth="0"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="absolute right-full mr-3 bg-white text-body px-2 py-1 rounded text-xs font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Dúvidas? Fale conosco
            </span>
          </a>
          <span>© {new Date().getFullYear()} Seniority Hub · Talent Intelligence</span>
        </div>
      </footer>
    </div>
  );
};

export default PortalVagas;
