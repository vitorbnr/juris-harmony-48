import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrazosView } from "./PrazosView";
import { prazosApi, processosApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", unidadeId: "un1" } }),
}));

vi.mock("@/services/api", () => ({
  prazosApi: {
    listar: vi.fn(),
    criar: vi.fn(),
    concluir: vi.fn(),
  },
  processosApi: {
    listar: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/components/prazos/CalendarioPrazos", () => ({
  CalendarioPrazos: ({ onClickDia }: { onClickDia: (d: string) => void }) => (
    <div data-testid="calendario-mock">
      <button onClick={() => onClickDia("2024-03-25")}>Clique Dia 25</button>
    </div>
  ),
}));

describe("PrazosView", () => {
  const mockPrazos = [
    {
      id: "pr1",
      titulo: "Prazo Teste",
      data: "2024-03-25",
      tipo: "prazo_processual",
      prioridade: "alta",
      concluido: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (prazosApi.listar as any).mockResolvedValue({ content: mockPrazos });
  });

  it("deve carregar e exibir a lista de prazos", async () => {
    render(<PrazosView />);
    expect(await screen.findByText(/Prazo Teste/i)).toBeDefined();
  });

  it("deve filtrar por dia ao clicar no calendário", async () => {
    render(<PrazosView />);
    
    const btnDia = screen.getByText(/Clique Dia 25/i);
    fireEvent.click(btnDia);
    
    expect(screen.getByText(/Filtrando:/i)).toBeDefined();
    expect(screen.getByText(/25 de março/i)).toBeDefined();
  });

  it("deve chamar a API para concluir um prazo", async () => {
    render(<PrazosView />);
    
    const btnConcluir = await screen.findByRole("button", { name: /Concluir/i });
    fireEvent.click(btnConcluir);
    
    expect(prazosApi.concluir).toHaveBeenCalledWith("pr1");
  });
});
