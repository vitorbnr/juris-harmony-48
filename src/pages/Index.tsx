import { useState } from "react";
import { Scale, Users, CalendarClock } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatCard } from "@/components/StatCard";
import { RecentProcesses } from "@/components/RecentProcesses";
import { UpcomingDeadlines } from "@/components/UpcomingDeadlines";
import { QuickActions } from "@/components/QuickActions";
import { ProcessosView } from "@/components/views/ProcessosView";
import { ClientesView } from "@/components/views/ClientesView";
import { PrazosView } from "@/components/views/PrazosView";
import { DocumentosView } from "@/components/views/DocumentosView";
import { ConfiguracoesView } from "@/components/views/ConfiguracoesView";
import { FinanceiroView } from "@/components/views/FinanceiroView";
import { UnidadeProvider } from "@/context/UnidadeContext";

const renderContent = (activeItem: string, onNavigate: (id: string) => void) => {
  switch (activeItem) {
    case "processos":
      return <ProcessosView />;
    case "clientes":
      return <ClientesView />;
    case "prazos":
      return <PrazosView />;
    case "documentos":
      return <DocumentosView />;
    case "financeiro":
      return <FinanceiroView />;
    case "configuracoes":
      return <ConfiguracoesView />;
    default:
      return (
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Scale}        label="Processos Ativos"   value={47}  change="+3 este mês"  changeType="positive" delay={0} />
            <StatCard icon={Users}        label="Clientes"           value={128} change="+5 este mês"  changeType="positive" delay={75} />
            <StatCard icon={CalendarClock}label="Prazos esta Semana" value={8}   change="2 urgentes"   changeType="negative" delay={150} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentProcesses />
            </div>
            <div className="space-y-6">
              <UpcomingDeadlines />
              <QuickActions />
            </div>
          </div>
        </div>
      );
  }
};

const Index = () => {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <UnidadeProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar activeItem={activeItem} onNavigate={setActiveItem} />
        <main className="flex-1 min-w-0 flex flex-col">
          <DashboardHeader activeItem={activeItem} onNavigate={setActiveItem} />
          {renderContent(activeItem, setActiveItem)}
        </main>
      </div>
    </UnidadeProvider>
  );
};

export default Index;
