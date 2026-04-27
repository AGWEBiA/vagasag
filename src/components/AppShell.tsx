import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  History,
  LogOut,
  Briefcase,
  Cpu,
  Users,
  Users2,
  HelpCircle,
  Layers,
  BarChart3,
  LifeBuoy,
  Palette,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { KanbanQuickAccess } from "@/components/KanbanQuickAccess";
import { BrandLogo } from "@/components/BrandLogo";
import { useBranding } from "@/hooks/useBranding";

const BASE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/nova-avaliacao", label: "Nova Avaliação", icon: Sparkles, badge: "IA" },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/vagas-admin", label: "Vagas", icon: Briefcase },
  { to: "/banco-talentos", label: "Talentos", icon: Users2 },
  { to: "/ajuda", label: "Ajuda", icon: LifeBuoy },
];

const ADMIN_NAV = [
  { to: "/admin/usuarios", label: "Usuários", icon: Users, badge: "Admin" },
  { to: "/admin/perguntas", label: "Perguntas", icon: HelpCircle, badge: "Admin" },
  { to: "/admin/pipeline", label: "Pipeline", icon: Layers, badge: "Admin" },
  { to: "/admin/branding", label: "Branding", icon: Palette, badge: "Admin" },
  { to: "/admin/ia", label: "Configuração de IA", icon: Cpu, badge: "Admin" },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const branding = useBranding();
  const NAV = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-6 border-b border-sidebar-border">
          {branding.logo_horizontal_url ? (
            <img
              src={branding.logo_horizontal_url}
              alt={branding.product_name}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <BrandLogo variant="mark" showText />
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-gold",
                  isActive &&
                    "bg-sidebar-accent text-gold ring-1 ring-gold/20 shadow-card",
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-gold-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{user?.email}</div>
              <div className="text-xs text-muted-foreground">
                {isAdmin ? "Admin Master" : "Recrutador"}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-sidebar-border hover:border-gold/40 hover:text-gold"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2">
          {branding.logo_mark_url ? (
            <img src={branding.logo_mark_url} alt={branding.product_name} className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary" />
          )}
          <span className="font-display font-semibold truncate max-w-[180px]">{branding.product_name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main className="flex-1 min-w-0 md:p-8 p-4 pt-20 md:pt-8 bg-gradient-hero">
        {/* Topbar desktop com atalhos rápidos */}
        <div className="hidden md:flex items-center justify-end gap-2 mb-4">
          <KanbanQuickAccess />
          <NavLink to="/ajuda">
            {({ isActive }) => (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "border-gold/40 hover:text-gold",
                  isActive && "text-gold",
                )}
              >
                <LifeBuoy className="h-4 w-4 mr-1.5" />
                Ajuda
              </Button>
            )}
          </NavLink>
        </div>
        <div className="mx-auto max-w-7xl">{children}</div>

        {/* Mobile nav */}
        <nav
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-sidebar-border bg-sidebar grid",
            NAV.length >= 7
              ? "grid-cols-7"
              : NAV.length === 6
              ? "grid-cols-6"
              : NAV.length === 5
              ? "grid-cols-5"
              : NAV.length === 4
              ? "grid-cols-4"
              : "grid-cols-3",
          )}
        >
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs",
                  isActive ? "text-gold" : "text-muted-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
};
