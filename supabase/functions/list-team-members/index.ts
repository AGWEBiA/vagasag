// Lista membros do time visíveis para qualquer usuário autenticado.
// Retorna apenas dados úteis para menções e atribuições (id, email, role).
// Nenhum dado sensível é exposto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Lista somente usuários do time (qualquer role do schema).
    const { data: usersList, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;

    const userIds = usersList.users.map((u) => u.id);
    const { data: rolesData } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const rolesMap = new Map<string, string[]>();
    (rolesData ?? []).forEach((r: { user_id: string; role: string }) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });

    // Filtra somente quem tem ao menos um papel "interno" (não 'user' apenas)
    const TEAM_ROLES = new Set(["admin", "recrutador", "lider", "colaborador"]);
    const members = usersList.users
      .filter((u) => {
        const rs = rolesMap.get(u.id) ?? [];
        return rs.some((r) => TEAM_ROLES.has(r));
      })
      .map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.full_name ?? (u.email?.split("@")[0] ?? ""),
        roles: rolesMap.get(u.id) ?? [],
      }));

    return json({ members });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("list-team-members error:", msg);
    return json({ error: msg }, 500);
  }
});
