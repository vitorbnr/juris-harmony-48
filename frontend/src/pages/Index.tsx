import { useState, useEffect } from "react";
import { Scale, Users, CalendarClock } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatCard } from "@/components/StatCard";
import { RecentProcesses } from "@/components/RecentProcesses";
import { UpcomingDeadlines } from "@/components/UpcomingDeadlines";
import { UrgencyPanel } from "@/components/UrgencyPanel";
import { QuickActions } from "@/components/QuickActions";
import { ProcessosPorAreaChart } from "@/components/ProcessosPorAreaChart";
import { StagnantProcesses } from "@/components/StagnantProcesses";
import { BlocoNotasDashboard } from "@/components/BlocoNotasDashboard";
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
import { dashboardApi } from "@/services/api";
import type { DashboardMetricas } from "@/types";

const EMPTY_DASHBOARD_METRICS: DashboardMetricas = {
  totalClientes: 0,
  processosAtivos: 0,
  prazosSemana: 0,
  prazosAtrasados: 0,
  prazosHoje: 0,
  tarefasAbertas: 0,
  proximosPrazos: [],
  processosRecentes: [],
  ultimasMovimentacoes: [],
  processosPorCidade: [],
  processosPorArea: [],
  processosParados: [],
};

const normalizeDashboardMetrics = (data: Partial<DashboardMetricas>): DashboardMetricas => ({
  ...EMPTY_DASHBOARD_METRICS,
  ...data,
  proximosPrazos: Array.isArray(data.proximosPrazos) ? data.proximosPrazos : [],
  processosRecentes: Array.isArray(data.processosRecentes) ? data.processosRecentes : [],
  ultimasMovimentacoes: Array.isArray(data.ultimasMovimentacoes) ? data.ultimasMovimentacoes : [],
  processosPorCidade: Array.isArray(data.processosPorCidade) ? data.processosPorCidade : [],
  processosPorArea: Array.isArray(data.processosPorArea) ? data.processosPorArea : [],
  processosParados: Array.isArray(data.processosParados) ? data.processosParados : [],
});

const DashboardContent = ({ onNavigate }: { onNavigate: (id: string) => void }) => {
  const [dashboardData, setDashboardData] = useState<DashboardMetricas>(EMPTY_DASHBOARD_METRICS);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    let ativo = true;

    dashboardApi
      .get()
      .then((data) => {
        if (!ativo) return;
        setDashboardData(normalizeDashboardMetrics(data));
      })
      .catch(() => {
        if (!ativo) return;
        setDashboardData(EMPTY_DASHBOARD_METRICS);
      })
      .finally(() => {
        if (ativo) {
          setLoadingDashboard(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Scale}         label="Processos Ativos"   value={dashboardData.processosAtivos} change="Ativos no momento"  changeType="positive" delay={0} />
        <StatCard icon={Users}         label="Clientes"           value={dashboardData.totalClientes}   change="Cadastrados"        changeType="positive" delay={75} />
        <StatCard icon={CalendarClock} label="Prazos esta semana" value={dashboardData.prazosSemana}    change="Pendentes"          changeType="negative" delay={150} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <RecentProcesses
            onNavigate={onNavigate}
            movimentacoes={dashboardData.ultimasMovimentacoes}
            loading={loadingDashboard}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProcessosPorAreaChart data={dashboardData.processosPorArea} loading={loadingDashboard} />
            <StagnantProcesses processos={dashboardData.processosParados} loading={loadingDashboard} />
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <UrgencyPanel
            prazosAtrasados={dashboardData.prazosAtrasados}
            prazosHoje={dashboardData.prazosHoje}
            tarefasAbertas={dashboardData.tarefasAbertas}
            loading={loadingDashboard}
          />
          <QuickActions />
          <UpcomingDeadlines prazos={dashboardData.proximosPrazos} loading={loadingDashboard} />
          <BlocoNotasDashboard />
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
      <div className="app-shell flex min-h-screen bg-transparent">
        <AppSidebar activeItem={activeItem} onNavigate={handleNavigate} />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent"
          />
          <DashboardHeader activeItem={activeItem} onNavigate={handleNavigate} />
          <div className="relative z-10 flex-1 min-h-0 overflow-auto">
            {renderContent(activeItem, handleNavigate)}
          </div>
        </main>
      </div>
    </UnidadeProvider>
  );
};

export default Index;
