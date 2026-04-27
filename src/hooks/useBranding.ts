import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  product_name: string;
  tagline: string | null;
  logo_horizontal_url: string | null;
  logo_mark_url: string | null;
  favicon_url: string | null;
  primary_color_hsl: string;
  primary_foreground_hsl: string;
  accent_color_hsl: string;
  autoaval_slug: string | null;
  autoaval_titulo: string | null;
  autoaval_descricao: string | null;
}

const DEFAULTS: BrandingSettings = {
  product_name: "Oportunidades AG WEBi",
  tagline: "Talent Intelligence",
  logo_horizontal_url: null,
  logo_mark_url: null,
  favicon_url: null,
  primary_color_hsl: "0 75% 35%",
  primary_foreground_hsl: "0 0% 100%",
  accent_color_hsl: "43 86% 50%",
  autoaval_slug: "time-ag-webi",
  autoaval_titulo: "Conte sobre sua trajetória",
  autoaval_descricao:
    "Suas respostas vão ajudar a liderança a entender seu nível atual e mapear oportunidades de crescimento. Apenas administradores e líderes verão sua avaliação.",
};

let cache: BrandingSettings | null = null;
const subscribers = new Set<(b: BrandingSettings) => void>();

const applyToDom = (b: BrandingSettings) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", b.primary_color_hsl);
  root.style.setProperty("--primary-foreground", b.primary_foreground_hsl);
  root.style.setProperty("--ring", b.primary_color_hsl);
  root.style.setProperty("--accent", b.accent_color_hsl);
  // Atualiza tokens "gold" para o accent (mantém a estética dourada onde usado)
  root.style.setProperty("--gold", b.accent_color_hsl);
  root.style.setProperty("--sidebar-primary", b.primary_color_hsl);
  // Título
  document.title = b.product_name;
  // Favicon
  if (b.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = b.favicon_url;
  }
};

const fetchBranding = async (): Promise<BrandingSettings> => {
  const { data } = await supabase
    .from("branding_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const merged: BrandingSettings = { ...DEFAULTS, ...(data ?? {}) } as BrandingSettings;
  cache = merged;
  applyToDom(merged);
  subscribers.forEach((cb) => cb(merged));
  return merged;
};

let initPromise: Promise<BrandingSettings> | null = null;
const ensureLoaded = () => {
  if (!initPromise) initPromise = fetchBranding();
  return initPromise;
};

export const refreshBranding = async () => {
  initPromise = fetchBranding();
  return initPromise;
};

export const useBranding = (): BrandingSettings => {
  const [state, setState] = useState<BrandingSettings>(cache ?? DEFAULTS);

  useEffect(() => {
    let mounted = true;
    void ensureLoaded().then((b) => {
      if (mounted) setState(b);
    });
    const cb = (b: BrandingSettings) => mounted && setState(b);
    subscribers.add(cb);
    return () => {
      mounted = false;
      subscribers.delete(cb);
    };
  }, []);

  return state;
};
