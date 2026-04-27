import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  email: string;
  nome: string;
  roles: string[];
}

let cache: TeamMember[] | null = null;
let cachePromise: Promise<TeamMember[]> | null = null;

/**
 * Lista membros do time (admin, recrutador, lider, colaborador).
 * Acessível a qualquer usuário autenticado via edge function `list-team-members`.
 * Resultado é cacheado em memória durante a sessão.
 */
export async function listTeamMembers(force = false): Promise<TeamMember[]> {
  if (!force && cache) return cache;
  if (!force && cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("list-team-members");
      if (error || !data?.members) return [];
      cache = data.members as TeamMember[];
      return cache;
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
