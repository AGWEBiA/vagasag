import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";
import { BrandLogo } from "@/components/BrandLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const branding = useBranding();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = `Redefinir senha · ${branding.product_name}`;
  }, [branding.product_name]);

  // Aguarda o Supabase processar o token de recuperação na URL.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Se já houver sessão de recuperação ativa
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.replace(/^\s+|\s+$/g, "");
    if (clean.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (clean !== confirm.replace(/^\s+|\s+$/g, "")) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: clean });
      if (error) throw error;
      toast.success("Senha atualizada! Faça login novamente.");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível atualizar a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          {branding.logo_horizontal_url ? (
            <img
              src={branding.logo_horizontal_url}
              alt={branding.product_name}
              className="h-16 w-auto object-contain mb-4"
            />
          ) : (
            <BrandLogo variant="mark" className="mb-4" />
          )}
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-center">
            Redefinir senha
          </h1>
        </div>

        <div className="surface-card rounded-xl p-6 sm:p-8 animate-fade-in">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              Validando link de redefinição… Se você abriu este link diretamente
              (sem clicar no e-mail recebido), volte ao{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-gold hover:text-gold-bright underline"
              >
                login
              </button>{" "}
              e clique em "Esqueci minha senha".
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:opacity-90"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Atualizar senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
