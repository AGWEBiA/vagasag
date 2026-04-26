import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ShieldCheck,
  UserPlus,
  Trash2,
  Users,
  Upload,
  Search,
  KeyRound,
  Copy,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AppRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  roles: AppRole[];
}

const ROLE_OPTIONS: AppRole[] = ["admin", "recrutador", "lider", "colaborador"];

const ROLE_BADGE: Record<AppRole, string> = {
  admin: "bg-gradient-gold text-gold-foreground",
  lider: "bg-gold/20 text-gold border border-gold/40",
  recrutador: "bg-pleno-bg text-body border border-sidebar-border",
  colaborador: "bg-surface-elevated text-muted-foreground border border-sidebar-border",
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const AdminUsuarios = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState(generatePassword());
  const [newRole, setNewRole] = useState<AppRole>("colaborador");
  const [creating, setCreating] = useState(false);

  // bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResults, setBulkResults] = useState<
    { email: string; ok: boolean; error?: string }[] | null
  >(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // delete
  const [toDelete, setToDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // role updating in row
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Gestão de Usuários | Seniority Hub";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      setUsers((data?.users ?? []) as UserRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword || newPassword.length < 8) {
      toast.error("Email e senha (mín. 8 caracteres) são obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          full_name: newName.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado!");
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword(generatePassword());
      setNewRole("colaborador");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  const handleSetRoles = async (u: UserRow, roles: AppRole[]) => {
    const sorted = [...roles].sort();
    const currentSorted = [...u.roles].sort();
    if (sorted.join(",") === currentSorted.join(",")) return;
    if (roles.length === 0) {
      toast.error("Selecione ao menos um papel.");
      return;
    }
    setUpdatingRole(u.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "set_roles", user_id: u.id, roles },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Papéis atualizados: ${roles.map((r) => ROLE_LABELS[r]).join(", ")}.`);
      setUsers((prev) =>
        prev.map((row) => (row.id === u.id ? { ...row, roles: data?.roles ?? roles } : row)),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar papéis.");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: toDelete.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário excluído.");
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      setToDelete(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulk = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Cole ao menos uma linha.");
      return;
    }
    const usersPayload = lines.map((line) => {
      // formato: email, role, nome
      const [email, role, ...rest] = line.split(",").map((p) => p.trim());
      const fullName = rest.join(",").trim();
      const validRole = ROLE_OPTIONS.includes(role as AppRole)
        ? (role as AppRole)
        : "colaborador";
      return {
        email,
        role: validRole,
        full_name: fullName || undefined,
      };
    });
    setBulkBusy(true);
    setBulkResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "bulk_create", users: usersPayload },
      });
      if (error) throw error;
      setBulkResults(data?.results ?? []);
      const ok = (data?.results ?? []).filter((r: any) => r.ok).length;
      toast.success(`Importação: ${ok}/${usersPayload.length} criados.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro na importação.");
    } finally {
      setBulkBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.roles.some((r) => r.includes(q)),
    );
  }, [users, search]);

  const counts = useMemo(() => {
    const c: Record<AppRole, number> = {
      admin: 0,
      recrutador: 0,
      lider: 0,
      colaborador: 0,
    };
    // Conta cada papel separadamente — um usuário pode aparecer em várias categorias
    users.forEach((u) => {
      const list = u.roles.length > 0 ? u.roles : (["colaborador"] as AppRole[]);
      list.forEach((role) => {
        if (role in c) c[role as AppRole]++;
      });
    });
    return c;
  }, [users]);

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pleno-bg text-gold text-xs font-medium mb-3 border border-gold/30">
            <ShieldCheck className="h-3 w-3" /> Admin · Usuários
          </div>
          <h1 className="font-display text-4xl font-semibold">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Crie, edite o papel e remova quem tem acesso ao Seniority Hub.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="border-gold/40 hover:bg-gold/10"
          >
            <Upload className="h-4 w-4 mr-2" /> Importar lista
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {ROLE_OPTIONS.map((r) => (
          <div key={r} className="surface-card rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {ROLE_LABELS[r]}
            </div>
            <div className="font-display text-2xl font-semibold mt-1">{counts[r]}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="surface-card rounded-xl p-4 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, nome ou papel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Nenhum usuário encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                <TableHead className="hidden md:table-cell">Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isMe = u.id === currentUser?.id;
                const role = (u.roles[0] ?? "colaborador") as AppRole;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name ?? u.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                        {isMe && (
                          <span className="ml-2 text-gold text-[10px] font-semibold">
                            (você)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            ROLE_BADGE[role],
                          )}
                        >
                          {ROLE_LABELS[role]}
                        </span>
                        <Select
                          value={role}
                          onValueChange={(v) => handleSetRole(u, v as AppRole)}
                          disabled={updatingRole === u.id || isMe}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingRole === u.id && (
                          <Loader2 className="h-3 w-3 animate-spin text-gold" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(u)}
                        disabled={isMe}
                        title={isMe ? "Você não pode excluir a si mesmo" : "Excluir"}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário poderá entrar imediatamente com a senha definida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome (opcional)</Label>
              <Input
                id="full_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Maria Souza"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Senha temporária</Label>
              <div className="flex gap-2">
                <Input
                  id="pwd"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewPassword(generatePassword())}
                  title="Gerar nova"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    toast.success("Senha copiada");
                  }}
                  title="Copiar"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Compartilhe com o usuário; ele pode alterar depois.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col items-start">
                        <span>{ROLE_LABELS[r]}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {ROLE_DESCRIPTIONS[r]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) setBulkResults(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar lista de usuários</DialogTitle>
            <DialogDescription>
              Uma linha por usuário no formato: <code className="text-gold">email, papel, nome</code>.
              Senhas serão geradas automaticamente. Compartilhe-as conforme cada usuário for adicionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`maria@empresa.com, colaborador, Maria Souza\njoao@empresa.com, recrutador, João Lima\nlider@empresa.com, lider, Ana Lider`}
              className="font-mono text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Papéis aceitos: {ROLE_OPTIONS.join(", ")}. Se omitido, usa "colaborador".
            </p>

            {bulkResults && (
              <div className="rounded-md border border-sidebar-border max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkResults.map((r) => (
                      <TableRow key={r.email}>
                        <TableCell className="text-xs">{r.email}</TableCell>
                        <TableCell className="text-xs">
                          {r.ok ? (
                            <span className="text-gold inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                          ) : (
                            <span className="text-destructive">{r.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleBulk}
              disabled={bulkBusy}
              className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold"
            >
              {bulkBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o acesso de <strong>{toDelete?.email}</strong>{" "}
              permanentemente. Avaliações já feitas por este usuário continuarão visíveis,
              mas ele não poderá mais entrar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default AdminUsuarios;
