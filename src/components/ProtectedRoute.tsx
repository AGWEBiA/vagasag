import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// Rotas que um colaborador (sem acesso ao painel) pode visitar.
const COLABORADOR_ALLOWED_PREFIXES = ["/autoavaliacao", "/time/"];

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const { hasPanelAccess, isColaborador, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Colaborador puro (sem acesso ao painel): só pode ver autoavaliação
  if (!hasPanelAccess && isColaborador) {
    const path = location.pathname;
    const allowed = COLABORADOR_ALLOWED_PREFIXES.some((p) =>
      p.endsWith("/") ? path.startsWith(p) : path === p,
    );
    if (!allowed) {
      return <Navigate to="/autoavaliacao" replace />;
    }
  }

  return <>{children}</>;
};
