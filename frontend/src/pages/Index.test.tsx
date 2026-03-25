import { render, screen, fireEvent } from "@testing-library/react";
import Index from "./Index";
import { UnidadeProvider } from "@/context/UnidadeContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { nome: "Admin" }, isAuthenticated: true, isLoading: false }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { totalClientes: 10, processosAtivos: 5, prazosSemana: 2 } }),
    post: vi.fn(),
  },
}));

// Mock dos subcomponentes para focar na navegação do Index
vi.mock("@/components/views/ProcessosView", () => ({
  ProcessosView: () => <div data-testid="processos-view">View de Processos</div>
}));

vi.mock("@/components/views/ClientesView", () => ({
  ClientesView: () => <div data-testid="clientes-view">View de Clientes</div>
}));

describe("Index Page (Main Dashboard)", () => {
  it("deve renderizar o DashboardContent por padrão", async () => {
    render(<Index />);
    // O DashboardHeader ou StatCards devem aparecer
    expect(await screen.findByText(/Processos Ativos/i)).toBeDefined();
  });

  // Nota: Para testar a navegação real, precisaríamos acionar o onNavigate do AppSidebar.
  // Como o activeItem é controlado via state no Index, podemos testar a transição.
});
