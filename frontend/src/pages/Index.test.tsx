import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Index from "./Index";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { nome: "Admin", papel: "ADMINISTRADOR" },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/DashboardHeader", () => ({
  DashboardHeader: ({ activeItem }: { activeItem: string }) => <div data-testid="dashboard-header">{activeItem}</div>,
}));

vi.mock("@/components/StatCard", () => ({
  StatCard: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/RecentProcesses", () => ({
  RecentProcesses: () => <div>Processos recentes</div>,
}));

vi.mock("@/components/UpcomingDeadlines", () => ({
  UpcomingDeadlines: () => <div>Próximos prazos</div>,
}));

vi.mock("@/components/UrgencyPanel", () => ({
  UrgencyPanel: () => <div>Painel de urgência</div>,
}));

vi.mock("@/components/QuickActions", () => ({
  QuickActions: () => <div>Ações rápidas</div>,
}));

vi.mock("@/components/ProcessosPorAreaChart", () => ({
  ProcessosPorAreaChart: () => <div>Demandas por área</div>,
}));

vi.mock("@/components/StagnantProcesses", () => ({
  StagnantProcesses: () => <div>Processos parados</div>,
}));

vi.mock("@/components/BlocoNotasDashboard", () => ({
  BlocoNotasDashboard: () => <div>Bloco de notas</div>,
}));

vi.mock("@/components/views/InboxJuridicaView", () => ({
  InboxJuridicaView: () => <div data-testid="inbox-view">View de Inbox</div>,
}));

vi.mock("@/components/views/GestaoKanbanView", () => ({
  GestaoKanbanView: () => <div data-testid="kanban-view">View de Kanban</div>,
}));

vi.mock("@/components/views/AgendaNotasView", () => ({
  AgendaNotasView: () => <div data-testid="agenda-view">View de Agenda</div>,
}));

vi.mock("@/components/views/ClientesView", () => ({
  ClientesView: () => <div data-testid="clientes-view">View de Clientes</div>,
}));

vi.mock("@/components/views/AtendimentosView", () => ({
  AtendimentosView: () => <div data-testid="atendimentos-view">View de Atendimentos</div>,
}));

vi.mock("@/components/views/ProcessosView", () => ({
  ProcessosView: () => <div data-testid="processos-view">View de Processos</div>,
}));

vi.mock("@/components/views/PublicacoesView", () => ({
  PublicacoesView: () => <div data-testid="publicacoes-view">View de Publicações</div>,
}));

vi.mock("@/components/views/DocumentosView", () => ({
  DocumentosView: () => <div data-testid="documentos-view">View de Documentos</div>,
}));

vi.mock("@/components/views/IndicadoresView", () => ({
  IndicadoresView: () => <div data-testid="indicadores-view">View de Indicadores</div>,
}));

vi.mock("@/components/views/ConfiguracoesView", () => ({
  ConfiguracoesView: () => <div data-testid="configuracoes-view">View de Configurações</div>,
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        totalClientes: 10,
        processosAtivos: 5,
        prazosSemana: 2,
        prazosAtrasados: 0,
        prazosHoje: 0,
        tarefasAbertas: 0,
        proximosPrazos: [],
        processosRecentes: [],
        ultimasMovimentacoes: [],
        processosPorCidade: [],
        processosPorArea: [],
        processosParados: [],
      },
    }),
  },
}));

const expectedMenuOrder = [
  "Dashboard",
  "Inbox Juridica",
  "Gestão Kanban",
  "Agenda e Notas",
  "Clientes",
  "Atendimentos",
  "Processos e Casos",
  "Publicacoes",
  "Documentos",
  "Indicadores",
];

describe("Index Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o dashboard por padrao com a nova malha de navegacao", async () => {
    render(<Index />);

    expect(await screen.findByText("Processos Ativos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prazos & Tarefas" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configuracoes" })).toBeInTheDocument();

    const buttons = expectedMenuOrder.map((label) => screen.getByRole("button", { name: label }));

    buttons.forEach((button, index) => {
      if (index === buttons.length - 1) return;

      expect(button.compareDocumentPosition(buttons[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("navega para as novas areas placeholder", () => {
    render(<Index />);

    fireEvent.click(screen.getByRole("button", { name: "Publicacoes" }));
    expect(screen.getByTestId("publicacoes-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Indicadores" }));
    expect(screen.getByTestId("indicadores-view")).toBeInTheDocument();
  });

  it("mantem o modulo de processos acessivel com o novo rotulo", () => {
    render(<Index />);

    fireEvent.click(screen.getByRole("button", { name: "Processos e Casos" }));
    expect(screen.getByTestId("processos-view")).toBeInTheDocument();
  });

  it("mantem configuracoes no footer da sidebar", () => {
    render(<Index />);

    fireEvent.click(screen.getByRole("button", { name: "Configuracoes" }));
    expect(screen.getByTestId("configuracoes-view")).toBeInTheDocument();
  });
});
