import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Analytics from "./pages/Analytics.tsx";
import NovaAvaliacao from "./pages/NovaAvaliacao.tsx";
import Historico from "./pages/Historico.tsx";
import Relatorio from "./pages/Relatorio.tsx";
import Vagas from "./pages/Vagas.tsx";
import InboxCandidaturas from "./pages/InboxCandidaturas.tsx";
import BancoTalentos from "./pages/BancoTalentos.tsx";
import AdminIA from "./pages/AdminIA.tsx";
import AdminUsuarios from "./pages/AdminUsuarios.tsx";
import AdminPerguntas from "./pages/AdminPerguntas.tsx";
import AdminPipeline from "./pages/AdminPipeline.tsx";
import VagaPipeline from "./pages/VagaPipeline.tsx";
import Autoavaliacao from "./pages/Autoavaliacao.tsx";
import PortalVagas from "./pages/PortalVagas.tsx";
import VagaPublica from "./pages/VagaPublica.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import Ajuda from "./pages/Ajuda.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/vagas" element={<PortalVagas />} />
            <Route path="/vagas/:id" element={<VagaPublica />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            {/* Authenticated (qualquer login) */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/autoavaliacao" element={<ProtectedRoute><Autoavaliacao /></ProtectedRoute>} />

            {/* Painel interno */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/nova-avaliacao" element={<ProtectedRoute><NovaAvaliacao /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
            <Route path="/relatorio/:id" element={<ProtectedRoute><Relatorio /></ProtectedRoute>} />
            <Route path="/vagas-admin" element={<ProtectedRoute><Vagas /></ProtectedRoute>} />
            <Route path="/banco-talentos" element={<ProtectedRoute><BancoTalentos /></ProtectedRoute>} />
            <Route
              path="/admin/candidaturas/:vagaId"
              element={<ProtectedRoute><InboxCandidaturas /></ProtectedRoute>}
            />
            <Route
              path="/vagas-admin/:vagaId/pipeline"
              element={<ProtectedRoute><VagaPipeline /></ProtectedRoute>}
            />

            {/* Admin only */}
            <Route path="/admin/ia" element={<AdminRoute><AdminIA /></AdminRoute>} />
            <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
            <Route path="/admin/perguntas" element={<ProtectedRoute><AdminPerguntas /></ProtectedRoute>} />
            <Route path="/admin/pipeline" element={<AdminRoute><AdminPipeline /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
