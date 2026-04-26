import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useUserRole();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="surface-card rounded-xl p-8 max-w-md text-center">
          <ShieldAlert className="h-10 w-10 text-gold mx-auto mb-3" />
          <h2 className="font-display text-2xl font-semibold mb-2">
            Acesso restrito
          </h2>
          <p className="text-muted-foreground text-sm">
            Esta área é exclusiva para administradores. Se você precisa de
            acesso, peça a um admin para promover seu usuário.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
