import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";
import { BrandLogo } from "@/components/BrandLogo";

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const branding = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Acesso · ${branding.product_name}`;
  }, [branding.product_name]);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está autenticado.");
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err?.message ?? "Erro ao autenticar";
      if (msg.toLowerCase().includes("invalid login")) {
        toast.error("E-mail ou senha incorretos.");
      } else if (msg.toLowerCase().includes("already registered")) {
        toast.error("Este e-mail já está cadastrado. Faça login.");
        setMode("signin");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          {branding.logo_horizontal_url ? (
            <img src={branding.logo_horizontal_url} alt={branding.product_name} className="h-16 w-auto object-contain mb-4" />
          ) : (
            <BrandLogo variant="mark" className="mb-4" />
          )}
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-center">
            {branding.product_name}
          </h1>
          {branding.tagline && (
            <p className="text-muted-foreground text-sm mt-2 text-center">{branding.tagline}</p>
          )}
        </div>

        <div className="surface-card rounded-xl p-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@agencia.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Primeiro acesso?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-gold hover:text-gold-bright font-medium"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-gold hover:text-gold-bright font-medium"
                >
                  Fazer login
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {branding.product_name} · acesso restrito
        </p>
      </div>
    </div>
  );
};

export default Login;
