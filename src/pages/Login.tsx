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
      const cleanEmail = email.trim().toLowerCase();
      // Senha pode ter espaços legítimos no meio, mas espaços nas pontas
      // quase sempre são lixo do autocomplete mobile.
      const cleanPassword = password.replace(/^\s+|\s+$/g, "");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: { emailRedirectTo: window.location.origin + "/" },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está autenticado.");
        navigate("/");
      }
    } catch (err: any) {
      const msg = (err?.message ?? "Erro ao autenticar").toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        toast.error("E-mail ainda não confirmado. Verifique sua caixa de entrada (e spam).");
      } else if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        toast.error("E-mail ou senha incorretos. Use 'Esqueci minha senha' se necessário.");
      } else if (msg.includes("already registered") || msg.includes("user already")) {
        toast.error("Este e-mail já está cadastrado. Faça login.");
        setMode("signin");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        toast.error("Muitas tentativas. Aguarde um minuto e tente novamente.");
      } else {
        toast.error(err?.message ?? "Erro ao autenticar");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("Enviamos um link de redefinição para seu e-mail.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível enviar o e-mail de redefinição.");
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
