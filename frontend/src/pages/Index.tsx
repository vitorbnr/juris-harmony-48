import { useState, useEffect } from "react";
import { Scale, Users, CalendarClock } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatCard } from "@/components/StatCard";
import { RecentProcesses } from "@/components/RecentProcesses";
import { UpcomingDeadlines } from "@/components/UpcomingDeadlines";
import { UrgencyPanel } from "@/components/UrgencyPanel";
import { QuickActions } from "@/components/QuickActions";
import { AtendimentosView } from "@/components/views/AtendimentosView";
import { GestaoKanbanView } from "@/components/views/GestaoKanbanView";
import { ProcessosView } from "@/components/views/ProcessosView";
import { InboxJuridicaView } from "@/components/views/InboxJuridicaView";
import { ClientesView } from "@/components/views/ClientesView";
import { AgendaNotasView } from "@/components/views/AgendaNotasView";
import { DocumentosView } from "@/components/views/DocumentosView";
import { PublicacoesView } from "@/components/views/PublicacoesView";
import { IndicadoresView } from "@/components/views/IndicadoresView";
import { ConfiguracoesView } from "@/components/views/ConfiguracoesView";
import { UnidadeProvider } from "@/context/UnidadeContext";
import { normalizeSectionId, type AppSectionId } from "@/lib/navigation";
import api from "@/lib/api";

interface DashboardStats {
  totalClientes: number;
  processosAtivos: number;
  prazosSemana: number;
  prazosAtrasados: number;
  prazosHoje: number;
  tarefasAbertas: number;
}

const DashboardContent = ({ onNavigate }: { onNavigate: (id: string) => void }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    processosAtivos: 0,
    prazosSemana: 0,
    prazosAtrasados: 0,
    prazosHoje: 0,
    tarefasAbertas: 0,
  });

  useEffect(() => {
    api.get("/dashboard").then(res => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Scale}         label="Processos Ativos"   value={stats.processosAtivos} change="Ativos no momento"  changeType="positive" delay={0} />
        <StatCard icon={Users}         label="Clientes"           value={stats.totalClientes}   change="Cadastrados"        changeType="positive" delay={75} />
        <StatCard icon={CalendarClock} label="Prazos esta Semana" value={stats.prazosSemana}    change="Pendentes"          changeType="negative" delay={150} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentProcesses onNavigate={onNavigate} />
        </div>
        <div className="space-y-6">
          <UrgencyPanel />
          <UpcomingDeadlines />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

const renderContent = (activeItem: AppSectionId, onNavigate: (id: string) => void) => {
  switch (activeItem) {
    case "inbox":
      return <InboxJuridicaView />;
    case "gestao-kanban":
      return <GestaoKanbanView />;
    case "agenda-notas":
      return <AgendaNotasView />;
    case "clientes":
      return <ClientesView />;
    case "atendimentos":
      return <AtendimentosView />;
    case "processos":
      return <ProcessosView />;
    case "publicacoes":
      return <PublicacoesView />;
    case "documentos":
      return <DocumentosView />;
    case "indicadores":
      return <IndicadoresView />;
    case "configuracoes":
      return <ConfiguracoesView />;
    default:
      return <DashboardContent onNavigate={onNavigate} />;
  }
};

const Index = () => {
  const [activeItem, setActiveItem] = useState<AppSectionId>("dashboard");

  const handleNavigate = (sectionId: string) => {
    setActiveItem(normalizeSectionId(sectionId));
  };

  return (
    <UnidadeProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar activeItem={activeItem} onNavigate={handleNavigate} />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <DashboardHeader activeItem={activeItem} onNavigate={handleNavigate} />
          <div className="flex-1 min-h-0 overflow-auto">
            {renderContent(activeItem, handleNavigate)}
          </div>
        </main>
      </div>
    </UnidadeProvider>
  );
};

export default Index;
