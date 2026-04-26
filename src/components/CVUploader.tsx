import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedCVFields {
  nome?: string;
  email?: string;
  telefone?: string;
  linkedin?: string;
  portfolio?: string;
  dados_profissionais?: string;
  skills?: string[];
  anos_experiencia?: number;
  idiomas?: string[];
  formacao?: string;
}

interface CVUploaderProps {
  onParsed: (fields: ParsedCVFields) => void;
}

const ACCEPTED = ".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 6 * 1024 * 1024; // 6MB

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:...;base64,"
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fileToText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export const CVUploader = ({ onParsed }: CVUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. Limite de 6MB.");
      return;
    }
    setFile(f);
  };

  const clear = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const parse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const isText = /\.txt$/i.test(file.name) || file.type === "text/plain";
      const payload: Record<string, unknown> = {};
      if (isText) {
        payload.text = await fileToText(file);
      } else {
        payload.fileBase64 = await fileToBase64(file);
        payload.mimeType = file.type || "application/pdf";
        payload.fileName = file.name;
      }

      const { data, error } = await supabase.functions.invoke("parse-cv", {
        body: payload,
      });
      if (error) throw error;
      const fields = (data?.fields ?? {}) as ParsedCVFields;
      onParsed(fields);
      toast.success("Campos preenchidos! Revise antes de enviar.");
    } catch (err: unknown) {
      console.error(err);
      const ctxErr = (err as { context?: { error?: string } })?.context?.error;
      const msg =
        ctxErr || (err instanceof Error ? err.message : "Erro ao analisar CV.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-gold/40 bg-gold/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold shadow-gold shrink-0">
          <Sparkles className="h-4 w-4 text-gold-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">Preencher com IA</div>
          <p className="text-xs text-muted-foreground">
            Envie seu currículo (PDF, DOC, TXT ou imagem) e a IA preenche o
            formulário automaticamente. Você pode revisar tudo antes de enviar.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onFileChange}
        className="hidden"
      />

      {file ? (
        <div className="flex items-center gap-2 rounded-md bg-surface-elevated px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-gold shrink-0" />
          <span className="truncate flex-1">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={clear}
            disabled={loading}
            className="text-muted-foreground hover:text-body"
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFile}
          disabled={loading}
          className="border-gold/40"
        >
          <Upload className="h-4 w-4 mr-2" />
          {file ? "Trocar arquivo" : "Selecionar currículo"}
        </Button>
        {file && (
          <Button
            type="button"
            size="sm"
            onClick={parse}
            disabled={loading}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analisar e preencher
          </Button>
        )}
      </div>
    </div>
  );
};
