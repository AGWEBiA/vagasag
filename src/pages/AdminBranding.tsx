import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { refreshBranding, useBranding } from "@/hooks/useBranding";
import { toast } from "sonner";
import { Loader2, Upload, Palette, Link2, Copy } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const hexToHsl = (hex: string): string | null => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToHex = (hsl: string): string => {
  const m = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!m) return "#000000";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const AdminBranding = () => {
  const branding = useBranding();
  const [productName, setProductName] = useState(branding.product_name);
  const [tagline, setTagline] = useState(branding.tagline ?? "");
  const [primaryHex, setPrimaryHex] = useState(hslToHex(branding.primary_color_hsl));
  const [accentHex, setAccentHex] = useState(hslToHex(branding.accent_color_hsl));
  const [logoUrl, setLogoUrl] = useState(branding.logo_horizontal_url ?? "");
  const [markUrl, setMarkUrl] = useState(branding.logo_mark_url ?? "");
  const [faviconUrl, setFaviconUrl] = useState(branding.favicon_url ?? "");
  const [autoavalSlug, setAutoavalSlug] = useState(branding.autoaval_slug ?? "");
  const [autoavalTitulo, setAutoavalTitulo] = useState(branding.autoaval_titulo ?? "");
  const [autoavalDescricao, setAutoavalDescricao] = useState(branding.autoaval_descricao ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Branding · ${branding.product_name}`;
    setProductName(branding.product_name);
    setTagline(branding.tagline ?? "");
    setPrimaryHex(hslToHex(branding.primary_color_hsl));
    setAccentHex(hslToHex(branding.accent_color_hsl));
    setLogoUrl(branding.logo_horizontal_url ?? "");
    setMarkUrl(branding.logo_mark_url ?? "");
    setFaviconUrl(branding.favicon_url ?? "");
    setAutoavalSlug(branding.autoaval_slug ?? "");
    setAutoavalTitulo(branding.autoaval_titulo ?? "");
    setAutoavalDescricao(branding.autoaval_descricao ?? "");
  }, [branding]);

  const slugify = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

  const autoavalUrl = autoavalSlug
    ? `${window.location.origin}/time/${autoavalSlug}`
    : `${window.location.origin}/autoavaliacao`;

  const upload = async (file: File, key: "horizontal" | "mark" | "favicon") => {
    setUploading(key);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${key}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const url = data.publicUrl;
      if (key === "horizontal") setLogoUrl(url);
      if (key === "mark") setMarkUrl(url);
      if (key === "favicon") setFaviconUrl(url);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    const primary_color_hsl = hexToHsl(primaryHex) ?? branding.primary_color_hsl;
    const accent_color_hsl = hexToHsl(accentHex) ?? branding.accent_color_hsl;
    const cleanSlug = autoavalSlug ? slugify(autoavalSlug) : null;
    const { error } = await supabase
      .from("branding_settings")
      .update({
        product_name: productName,
        tagline,
        logo_horizontal_url: logoUrl || null,
        logo_mark_url: markUrl || null,
        favicon_url: faviconUrl || null,
        primary_color_hsl,
        accent_color_hsl,
        autoaval_slug: cleanSlug,
        autoaval_titulo: autoavalTitulo || null,
        autoaval_descricao: autoavalDescricao || null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshBranding();
    toast.success("Branding atualizado");
  };

  const FileBtn = ({ k, label }: { k: "horizontal" | "mark" | "favicon"; label: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], k)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading === k}>
          {uploading === k ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {label}
        </Button>
      </>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
            <Palette className="h-7 w-7 text-primary" /> Identidade Visual
          </h1>
          <p className="text-muted-foreground">White label: configure logo, nome e cores do sistema.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Identidade</CardTitle>
              <CardDescription>Nome e slogan exibidos em todo o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do produto</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slogan / tagline</Label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cores</CardTitle>
              <CardDescription>Aplicadas em botões, links e destaques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cor primária (CTAs, links)</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="h-10 w-16 rounded border border-border bg-transparent" />
                  <Input value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de acento (badges, detalhes premium)</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={accentHex} onChange={(e) => setAccentHex(e.target.value)} className="h-10 w-16 rounded border border-border bg-transparent" />
                  <Input value={accentHex} onChange={(e) => setAccentHex(e.target.value)} className="font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Logos & Favicon</CardTitle>
              <CardDescription>PNG/SVG. Logo horizontal aparece em headers; mark é o ícone quadrado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Logo horizontal (sidebar/login)</Label>
                  <div className="h-24 rounded border border-border bg-sidebar flex items-center justify-center p-3">
                    {logoUrl ? <img src={logoUrl} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sem logo</span>}
                  </div>
                  <FileBtn k="horizontal" label="Enviar logo horizontal" />
                  <Input placeholder="ou cole uma URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Logo mark (quadrado)</Label>
                  <div className="h-24 rounded border border-border bg-sidebar flex items-center justify-center p-3">
                    {markUrl ? <img src={markUrl} alt="mark" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sem mark</span>}
                  </div>
                  <FileBtn k="mark" label="Enviar mark" />
                  <Input placeholder="ou cole uma URL" value={markUrl} onChange={(e) => setMarkUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="h-24 rounded border border-border bg-sidebar flex items-center justify-center p-3">
                    {faviconUrl ? <img src={faviconUrl} alt="favicon" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sem favicon</span>}
                  </div>
                  <FileBtn k="favicon" label="Enviar favicon" />
                  <Input placeholder="ou cole uma URL" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Autoavaliação do time
              </CardTitle>
              <CardDescription>
                Personalize a URL, o título e a mensagem da página que os colaboradores vão acessar para se autoavaliar.
                O login continua obrigatório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL personalizada (slug)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {window.location.origin}/time/
                  </span>
                  <Input
                    value={autoavalSlug}
                    onChange={(e) => setAutoavalSlug(slugify(e.target.value))}
                    placeholder="ex: time-ag-webi"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas letras minúsculas, números e hífens. Deixe em branco para usar apenas <code>/autoavaliacao</code>.
                </p>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <code className="text-xs md:text-sm break-all text-primary">{autoavalUrl}</code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(autoavalUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Título da página</Label>
                <Input
                  value={autoavalTitulo}
                  onChange={(e) => setAutoavalTitulo(e.target.value)}
                  placeholder="Conte sobre sua trajetória"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  value={autoavalDescricao}
                  onChange={(e) => setAutoavalDescricao(e.target.value)}
                  placeholder="Explique para o colaborador como a autoavaliação será usada..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border p-6 bg-sidebar">
                <BrandLogo variant="horizontal" />
              </div>
              <div className="mt-4 flex gap-3">
                <Button>Botão primário</Button>
                <Button variant="outline">Secundário</Button>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-gold text-gold-foreground">Badge IA</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar branding
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default AdminBranding;
