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
  Menu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { KanbanQuickAccess } from "@/components/KanbanQuickAccess";
import { BrandLogo } from "@/components/BrandLogo";
import { useBranding } from "@/hooks/useBranding";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const NAV = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClick}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-all min-h-[44px]",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-gold",
              isActive &&
                "bg-sidebar-accent text-gold ring-1 ring-gold/20 shadow-card",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );

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

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <NavItems />
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
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 bg-sidebar border-sidebar-border flex flex-col">
              <SheetHeader className="px-4 py-4 border-b border-sidebar-border">
                <SheetTitle className="text-left">
                  {branding.logo_horizontal_url ? (
                    <img
                      src={branding.logo_horizontal_url}
                      alt={branding.product_name}
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <span className="font-display">{branding.product_name}</span>
                  )}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <NavItems onClick={() => setMobileOpen(false)} />
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
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 min-w-0">
            {branding.logo_mobile_url ? (
              <img
                src={branding.logo_mobile_url}
                alt={branding.product_name}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : branding.logo_mark_url ? (
              <>
                <img src={branding.logo_mark_url} alt={branding.product_name} className="h-7 w-7 rounded-md object-cover" />
                <span className="font-display font-semibold truncate text-sm">{branding.product_name}</span>
              </>
            ) : (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary" />
                <span className="font-display font-semibold truncate text-sm">{branding.product_name}</span>
              </>
            )}
          </div>
        </div>
        <NavLink to="/ajuda" aria-label="Ajuda">
          <Button variant="ghost" size="icon">
            <LifeBuoy className="h-5 w-5" />
          </Button>
        </NavLink>
      </div>

      <main className="flex-1 min-w-0 md:p-8 px-4 py-4 pt-16 md:pt-8 bg-gradient-hero pb-8">
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
      </main>
    </div>
  );
};
