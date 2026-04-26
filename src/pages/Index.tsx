import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { hasPanelAccess, loading } = useUserRole();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }
  return <Navigate to={hasPanelAccess ? "/dashboard" : "/autoavaliacao"} replace />;
};

export default Index;
