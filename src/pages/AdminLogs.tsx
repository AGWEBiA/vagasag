import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [vagas, setVagas] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Carrega vagas para mapear nomes
    const { data: vData } = await supabase.from("vagas").select("id, titulo");
    const vMap: Record<string, string> = {};
    vData?.forEach(v => vMap[v.id] = v.titulo);
    setVagas(vMap);

    const { data, error } = await supabase
      .from("candidatura_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    log.status === "validation_failed" && 
    (vagas[log.vaga_id]?.toLowerCase().includes(filter.toLowerCase()) || 
     JSON.stringify(log.payload).toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Audit de Validação</h1>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Filtrar por vaga ou conteúdo..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="icon" onClick={loadData}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscrições com Falha de Validação</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum log de falha encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="relative overflow-x-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Vaga</th>
                    <th className="px-4 py-3">Campos Vazios</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => {
                    const errors = JSON.parse(log.error || "{}");
                    const errorCount = Object.keys(errors).length;
                    
                    return (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {vagas[log.vaga_id] || "Vaga removida"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {errorCount} campos
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Tentativa de Inscrição</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Campos com Erro</h4>
                                  <ul className="list-disc list-inside text-xs space-y-1 text-destructive">
                                    {Object.entries(errors).map(([key, val]: [string, any]) => (
                                      <li key={key}>{key}: {val}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Dados Enviados (Payload)</h4>
                                  <pre className="bg-muted p-4 rounded-md text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  ID: {log.id} | User Agent: {log.user_agent}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;
