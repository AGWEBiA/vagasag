import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "recrutador" | "lider" | "colaborador";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  recrutador: "Recrutador",
  lider: "Líder",
  colaborador: "Colaborador",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acesso total ao sistema, gestão de usuários e configurações.",
  recrutador: "Cria vagas e avalia candidatos que ele mesmo cadastrou.",
  lider: "Vê todas as avaliações do time e candidatos.",
  colaborador: "Apenas envia a própria autoavaliação.",
};

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("useUserRole error", error);
          setRoles([]);
        } else {
          setRoles((data ?? []).map((r) => r.role as AppRole));
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isLider = isAdmin || roles.includes("lider");
  const isRecrutador = isAdmin || roles.includes("recrutador");
  const isColaborador = roles.includes("colaborador");
  // Tem acesso ao painel interno (qualquer coisa exceto colaborador puro)
  const hasPanelAccess = isAdmin || isLider || isRecrutador;

  return {
    roles,
    isAdmin,
    isLider,
    isRecrutador,
    isColaborador,
    hasPanelAccess,
    loading: loading || authLoading,
  };
}
