import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, CheckCircle2, Clock, ExternalLink, FileCode } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SyncHistory {
  id: string;
  last_migration_name: string;
  last_commit_hash: string;
  last_commit_message: string;
  last_sync_at: string;
  repo_url: string;
}

const HistoricoSincronizacao = () => {
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('github_sync_status' as any)
        .select('*')
        .order('last_sync_at', { ascending: false });
      
      if (!error && data) {
        setHistory(data as any);
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  const getGitHubUrl = (repoUrl: string | null, hash: string) => {
    // Fallback se repo_url não estiver configurado corretamente
    const baseUrl = repoUrl || "https://github.com/lovable-user/project-repo";
    return `${baseUrl}/commit/${hash}`;
  };

  return (
    <AppShell>
      <header className="mb-8 animate-fade-in">
        <h1 className="font-display text-4xl font-semibold">Histórico de Deploy</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe os arquivos SQL e commits sincronizados com o GitHub.
        </p>
      </header>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-20">Carregando histórico...</div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma sincronização registrada ainda.
            </CardContent>
          </Card>
        ) : (
          history.map((item) => (
            <Card key={item.id} className="surface-card border-sidebar-border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border bg-muted/30 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Deploy Realizado</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.last_sync_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20">
                  Sucesso
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <FileCode className="h-5 w-5 text-gold mt-1 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Arquivo SQL (Migration)</h4>
                        <code className="text-xs bg-muted p-2 rounded block break-all font-mono">
                          {item.last_migration_name}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Github className="h-5 w-5 text-gold mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold mb-1">Commit GitHub</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {item.last_commit_hash}
                          </Badge>
                          <span className="text-sm truncate">{item.last_commit_message}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full md:w-auto h-8 text-xs border-gold/40 hover:text-gold"
                          onClick={() => window.open(getGitHubUrl(item.repo_url, item.last_commit_hash), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Ver no GitHub
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
};

export default HistoricoSincronizacao;
