// Edge function admin: lista, cria, atualiza papel e exclui usuários.
// Apenas chamadores autenticados com papel 'admin' podem usar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { action: "list" }
  | {
      action: "create";
      email: string;
      password: string;
      role: AppRole;
      full_name?: string;
    }
  | { action: "bulk_create"; users: BulkUser[] }
  | { action: "set_role"; user_id: string; role: AppRole }
  | { action: "set_roles"; user_id: string; roles: AppRole[] }
  | { action: "delete"; user_id: string };

type AppRole = "admin" | "recrutador" | "lider" | "colaborador";
interface BulkUser {
  email: string;
  password?: string;
  role?: AppRole;
  full_name?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ROLES: AppRole[] = ["admin", "recrutador", "lider", "colaborador"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Autenticar requisitante
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Não autenticado" }, 401);
    }

    // 2. Verificar role admin
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (rolesErr) throw rolesErr;
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return json({ error: "Apenas admins podem usar este endpoint." }, 403);
    }

    const body = (await req.json()) as Action;

    switch (body.action) {
      case "list":
        return await handleList(admin);
      case "create":
        return await handleCreate(admin, body);
      case "bulk_create":
        return await handleBulkCreate(admin, body.users);
      case "set_role":
        return await handleSetRole(admin, body);
      case "delete":
        return await handleDelete(admin, body.user_id, userData.user.id);
      default:
        return json({ error: "Ação inválida" }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("admin-users error:", msg);
    return json({ error: msg }, 500);
  }
});

async function handleList(admin: ReturnType<typeof createClient>) {
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

  return json({
    users: usersList.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      full_name: u.user_metadata?.full_name ?? null,
      roles: rolesMap.get(u.id) ?? [],
    })),
  });
}

async function handleCreate(
  admin: ReturnType<typeof createClient>,
  body: Extract<Action, { action: "create" }>,
) {
  if (!body.email || !body.password || !body.role) {
    return json({ error: "email, password e role são obrigatórios" }, 400);
  }
  if (!ALLOWED_ROLES.includes(body.role)) {
    return json({ error: "Role inválido" }, 400);
  }
  if (body.password.length < 8) {
    return json({ error: "Senha deve ter ao menos 8 caracteres" }, 400);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name ?? null },
  });
  if (error) throw error;

  // Substituir role padrão atribuído pelo trigger
  await admin.from("user_roles").delete().eq("user_id", data.user.id);
  await admin.from("user_roles").insert({ user_id: data.user.id, role: body.role });

  return json({ ok: true, user_id: data.user.id });
}

async function handleBulkCreate(
  admin: ReturnType<typeof createClient>,
  users: BulkUser[],
) {
  if (!Array.isArray(users) || users.length === 0) {
    return json({ error: "Lista vazia" }, 400);
  }
  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const u of users) {
    try {
      if (!u.email) throw new Error("email vazio");
      const role: AppRole = u.role && ALLOWED_ROLES.includes(u.role) ? u.role : "colaborador";
      const password =
        u.password && u.password.length >= 8 ? u.password : randomPassword();
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name ?? null },
      });
      if (error) throw error;
      await admin.from("user_roles").delete().eq("user_id", data.user.id);
      await admin.from("user_roles").insert({ user_id: data.user.id, role });
      results.push({ email: u.email, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      results.push({ email: u.email, ok: false, error: msg });
    }
  }
  return json({ results });
}

async function handleSetRole(
  admin: ReturnType<typeof createClient>,
  body: Extract<Action, { action: "set_role" }>,
) {
  if (!body.user_id || !body.role) return json({ error: "user_id e role obrigatórios" }, 400);
  if (!ALLOWED_ROLES.includes(body.role)) return json({ error: "Role inválido" }, 400);

  await admin.from("user_roles").delete().eq("user_id", body.user_id);
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: body.user_id, role: body.role });
  if (error) throw error;
  return json({ ok: true });
}

async function handleDelete(
  admin: ReturnType<typeof createClient>,
  userIdToDelete: string,
  callerId: string,
) {
  if (userIdToDelete === callerId) {
    return json({ error: "Você não pode excluir a si mesmo." }, 400);
  }
  const { error } = await admin.auth.admin.deleteUser(userIdToDelete);
  if (error) throw error;
  return json({ ok: true });
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
