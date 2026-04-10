import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProcessosView } from "./ProcessosView";
import { useUnidade } from "@/context/UnidadeContext";
import { processosApi } from "@/services/api";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/context/UnidadeContext", () => ({
  useUnidade: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  processosApi: {
    listar: vi.fn(),
  },
}));

vi.mock("@/components/modals/NovoProcessoModal", () => ({
  NovoProcessoModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="novo-processo-modal">
      <button onClick={onClose}>Fechar</button>
    </div>
  ),
}));

describe("ProcessosView", () => {
  const mockProcessos = [
    {
      id: "p1",
      numero: "1234567-89.2024.8.26.0100",
      clienteNome: "João Silva",
      tipo: "CIVEL",
      advogadoNome: "Dr. Rafael",
      status: "EM_ANDAMENTO",
      unidadeId: "u1",
      unidadeNome: "Sede",
      dataDistribuicao: "2024-01-01",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useUnidade as any).mockReturnValue({ unidadeSelecionada: "todas" });
    (processosApi.listar as any).mockResolvedValue({ content: mockProcessos });
  });

  it("deve carregar e exibir a lista de processos", async () => {
    render(<ProcessosView />);
    
    expect(await screen.findByText(/João Silva/i)).toBeDefined();
    expect(screen.getByText(/1234567/i)).toBeDefined();
  });

  it("deve abrir o modal de novo processo ao clicar no botão", async () => {
    render(<ProcessosView />);
    
    const btnNovo = screen.getByRole("button", { name: /Novo Processo/i });
    fireEvent.click(btnNovo);
    
    expect(screen.getByTestId("novo-processo-modal")).toBeDefined();
  });

  it("deve filtrar processos por busca de texto", async () => {
    render(<ProcessosView />);
    
    const inputBusca = screen.getByPlaceholderText(/Buscar por numero ou cliente/i);
    fireEvent.change(inputBusca, { target: { value: "Inexistente" } });
    
    // O componente filtra localmente após carregar ou recarrega? 
    // No código, carregarProcessos depende de 'busca'.
    
    await waitFor(() => {
       expect(processosApi.listar).toHaveBeenCalledWith(expect.objectContaining({ busca: "Inexistente" }));
    });
  });

  it("deve exibir o drawer de detalhes ao clicar em um processo", async () => {
    render(<ProcessosView />);
    
    const linha = await screen.findByText(/João Silva/i);
    fireEvent.click(linha);
    
    expect(screen.getByText(/Dados do Processo/i)).toBeDefined();
    expect(screen.getByText(/1234567-89.2024.8.26.0100/i)).toBeDefined();
  });
});
