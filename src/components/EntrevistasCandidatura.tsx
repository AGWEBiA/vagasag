import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  Phone,
  User,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Entrevista,
  type EntrevistaModalidade,
  type EntrevistaStatus,
  STATUS_LABEL,
  STATUS_COLOR,
  MODALIDADE_LABEL,
  criarEntrevista,
  enviarConviteEntrevista,
  atualizarStatusEntrevista,
  listarEntrevistasDaCandidatura,
  getIcsUrl,
} from "@/lib/entrevistas";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  candidaturaId: string;
  vagaId: string;
  candidatoNome: string;
  candidatoEmail: string;
  vagaTitulo: string;
}

export function EntrevistasCandidatura({
  candidaturaId,
  vagaId,
  candidatoNome,
  candidatoEmail,
  vagaTitulo,
}: Props) {
  const [items, setItems] = useState<Entrevista[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`entrevistas-${candidaturaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entrevistas", filter: `candidatura_id=eq.${candidaturaId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [candidaturaId]);

  async function load() {
    setLoading(true);
    const { data } = await listarEntrevistasDaCandidatura(candidaturaId);
    setItems(data);
    setLoading(false);
  }

  async function handleStatusChange(e: Entrevista, status: EntrevistaStatus) {
    const { error } = await atualizarStatusEntrevista(e.id, status);
    if (error) toast.error(error);
    else toast.success(`Status atualizado para "${STATUS_LABEL[status]}"`);
  }

  async function handleResend(e: Entrevista) {
    const r = await enviarConviteEntrevista({
      entrevista: e,
      candidatoNome,
      candidatoEmail,
      vagaTitulo,
    });
    if (r.ok) toast.success("Convite reenviado");
    else toast.error("Falha ao reenviar convite");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Entrevistas</h3>
          <p className="text-xs text-muted-foreground">
            Agende entrevistas e envie convite por e-mail com calendário.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Nova entrevista
            </Button>
          </DialogTrigger>
          <NovaEntrevistaDialog
            candidaturaId={candidaturaId}
            vagaId={vagaId}
            candidatoNome={candidatoNome}
            candidatoEmail={candidatoEmail}
            vagaTitulo={vagaTitulo}
            onClose={() => setOpenDialog(false)}
            onCreated={() => {
              setOpenDialog(false);
              void load();
            }}
          />
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma entrevista agendada.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{e.titulo}</span>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        STATUS_COLOR[e.status],
                      )}
                    >
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(e.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(e.data_inicio), "HH:mm")} –{" "}
                      {format(new Date(e.data_fim), "HH:mm")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {e.modalidade === "online" ? (
                        <Video className="h-3 w-3" />
                      ) : e.modalidade === "presencial" ? (
                        <MapPin className="h-3 w-3" />
                      ) : (
                        <Phone className="h-3 w-3" />
                      )}
                      {MODALIDADE_LABEL[e.modalidade]}
                    </span>
                    {e.entrevistador_nome && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {e.entrevistador_nome}
                      </span>
                    )}
                  </div>
                  {e.link_video && (
                    <a
                      href={e.link_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline truncate"
                    >
                      {e.link_video} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                  {e.descricao && (
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {e.descricao}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <Select
                  value={e.status}
                  onValueChange={(v) => handleStatusChange(e, v as EntrevistaStatus)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as EntrevistaStatus[]).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => handleResend(e)}>
                  <Mail className="h-3 w-3" /> Reenviar convite
                </Button>
                <a
                  href={getIcsUrl(e.id)}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent"
                >
                  <CalendarIcon className="h-3 w-3" /> Baixar .ics
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface NovaEntrevistaProps {
  candidaturaId: string;
  vagaId: string;
  candidatoNome: string;
  candidatoEmail: string;
  vagaTitulo: string;
  onClose: () => void;
  onCreated: () => void;
}

function NovaEntrevistaDialog(p: NovaEntrevistaProps) {
  const [titulo, setTitulo] = useState("Entrevista");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [modalidade, setModalidade] = useState<EntrevistaModalidade>("online");
  const [linkVideo, setLinkVideo] = useState("");
  const [local, setLocal] = useState("");
  const [entrevistadorNome, setEntrevistadorNome] = useState("");
  const [entrevistadorEmail, setEntrevistadorEmail] = useState("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!data) {
      toast.error("Selecione uma data");
      return;
    }
    if (!titulo.trim()) {
      toast.error("Informe o título");
      return;
    }
    const [h, m] = horaInicio.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      toast.error("Horário inválido");
      return;
    }
    const inicio = new Date(data);
    inicio.setHours(h, m, 0, 0);
    const fim = new Date(inicio.getTime() + duracaoMin * 60_000);

    setSubmitting(true);
    const { data: ent, error } = await criarEntrevista({
      candidaturaId: p.candidaturaId,
      vagaId: p.vagaId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      dataInicio: inicio,
      dataFim: fim,
      modalidade,
      linkVideo: modalidade === "online" ? linkVideo.trim() || undefined : undefined,
      local: modalidade !== "online" ? local.trim() || undefined : undefined,
      entrevistadorNome: entrevistadorNome.trim() || undefined,
      entrevistadorEmail: entrevistadorEmail.trim() || undefined,
      enviarEmailConvite: enviarEmail,
    });

    if (error || !ent) {
      setSubmitting(false);
      toast.error(error || "Erro ao criar entrevista");
      return;
    }

    if (enviarEmail) {
      const r = await enviarConviteEntrevista({
        entrevista: ent,
        candidatoNome: p.candidatoNome,
        candidatoEmail: p.candidatoEmail,
        vagaTitulo: p.vagaTitulo,
      });
      if (r.ok) toast.success("Entrevista agendada e convite enviado");
      else toast.warning("Entrevista agendada, mas o convite falhou");
    } else {
      toast.success("Entrevista agendada");
    }
    setSubmitting(false);
    p.onCreated();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Agendar entrevista</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Entrevista técnica"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !data && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "PPP", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={setData}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dur">Duração</Label>
              <Select
                value={String(duracaoMin)}
                onValueChange={(v) => setDuracaoMin(Number(v))}
              >
                <SelectTrigger id="dur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Modalidade</Label>
          <Select
            value={modalidade}
            onValueChange={(v) => setModalidade(v as EntrevistaModalidade)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online (vídeo)</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {modalidade === "online" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="link">Link da reunião</Label>
            <Input
              id="link"
              value={linkVideo}
              onChange={(e) => setLinkVideo(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder={modalidade === "telefone" ? "Número/contato" : "Endereço"}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="entr-nome">Entrevistador</Label>
            <Input
              id="entr-nome"
              value={entrevistadorNome}
              onChange={(e) => setEntrevistadorNome(e.target.value)}
              placeholder="Nome"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="entr-email">E-mail</Label>
            <Input
              id="entr-email"
              type="email"
              value={entrevistadorEmail}
              onChange={(e) => setEntrevistadorEmail(e.target.value)}
              placeholder="opcional"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="desc">Descrição (opcional)</Label>
          <Textarea
            id="desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Pauta, links, instruções..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <Label className="text-sm">Enviar convite por e-mail</Label>
            <p className="text-xs text-muted-foreground">
              Inclui link Google Calendar e arquivo .ics.
            </p>
          </div>
          <Switch checked={enviarEmail} onCheckedChange={setEnviarEmail} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={p.onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Agendar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
