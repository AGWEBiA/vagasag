import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, Check, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; msg: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    document.title = "Cancelar inscrição | Banco de Talentos AG";
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } },
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.valid) setState({ kind: "valid" });
        else if (json?.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch {
        setState({ kind: "error", msg: "Falha ao validar o link." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({ token }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) setState({ kind: "done" });
      else if (json?.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", msg: json?.error || "Falha ao processar." });
    } catch {
      setState({ kind: "error", msg: "Erro de rede." });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="surface-card max-w-md w-full rounded-xl p-8 text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto mb-4" />
            <p className="text-muted-foreground">Validando link…</p>
          </>
        )}
        {state.kind === "valid" && (
          <>
            <MailX className="h-10 w-10 text-gold mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold mb-2">
              Cancelar e-mails?
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Você não receberá mais e-mails do nosso banco de talentos.
            </p>
            <Button
              onClick={confirm}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold w-full"
            >
              Confirmar cancelamento
            </Button>
          </>
        )}
        {state.kind === "submitting" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto mb-4" />
            <p className="text-muted-foreground">Processando…</p>
          </>
        )}
        {state.kind === "done" && (
          <>
            <Check className="h-10 w-10 text-pleno mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold mb-2">
              Inscrição cancelada
            </h1>
            <p className="text-sm text-muted-foreground">
              Você não receberá mais nossos e-mails. Pode fechar esta aba.
            </p>
          </>
        )}
        {state.kind === "already" && (
          <>
            <Check className="h-10 w-10 text-pleno mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold mb-2">
              Já cancelado
            </h1>
            <p className="text-sm text-muted-foreground">
              Esta inscrição já havia sido cancelada anteriormente.
            </p>
          </>
        )}
        {state.kind === "invalid" && (
          <>
            <AlertCircle className="h-10 w-10 text-junior mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold mb-2">
              Link inválido
            </h1>
            <p className="text-sm text-muted-foreground">
              Este link de cancelamento não é válido ou expirou.
            </p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-junior mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold mb-2">Erro</h1>
            <p className="text-sm text-muted-foreground">{state.msg}</p>
          </>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
