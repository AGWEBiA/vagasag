import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  email: string;
  nome: string;
  role: string;
}

let cache: TeamMember[] | null = null;
let cachePromise: Promise<TeamMember[]> | null = null;

/**
 * Lista membros do time (admin, recrutador, lider, colaborador).
 * Usa o edge function admin-users que já retorna usuários + roles.
 * Resultado é cacheado em memória durante a sessão.
 */
export async function listTeamMembers(force = false): Promise<TeamMember[]> {
  if (!force && cache) return cache;
  if (!force && cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (error || !data?.users) return [];
      const members: TeamMember[] = (data.users as any[]).map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.email?.split("@")[0] ?? "",
        role: u.role ?? "user",
      }));
      cache = members;
      return members;
    } catch {
      return [];
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

export function clearTeamCache() {
  cache = null;
}
