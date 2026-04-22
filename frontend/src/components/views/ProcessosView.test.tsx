import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProcessosView } from "./ProcessosView";
import { useUnidade } from "@/context/UnidadeContext";
import { processosApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/context/UnidadeContext", () => ({
  useUnidade: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  processosApi: {
    listar: vi.fn(),
    buscar: vi.fn(),
    sincronizarDatajudEmLote: vi.fn(),
  },
}));

vi.mock("@/components/modals/NovoProcessoModal", () => ({
  NovoProcessoModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="novo-processo-modal">
      <button onClick={onClose}>Fechar</button>
    </div>
  ),
}));

vi.mock("@/components/modals/ProcessoDossieModal", () => ({
  ProcessoDossieModal: ({
    open,
    processoId,
    onClose,
  }: {
    open: boolean;
    processoId: string | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="processo-dossie-modal">
        <span>Dossie aberto: {processoId}</span>
        <button onClick={onClose}>Fechar dossie</button>
      </div>
    ) : null,
}));

describe("ProcessosView", () => {
  const mockProcessos = [
    {
      id: "p1",
      clienteId: "c1",
      numero: "1234567-89.2024.8.26.0100",
      clienteNome: "Joao Silva",
      tipo: "CIVEL",
      advogadoNome: "Dr. Rafael",
      status: "EM_ANDAMENTO",
      unidadeId: "u1",
      unidadeNome: "Sede",
      dataDistribuicao: "2024-01-01",
      ultimaMovimentacao: "2024-04-15",
      partes: [
        { id: "parte-1", nome: "Joao Silva", polo: "ATIVO" },
        { id: "parte-2", nome: "Banco XPTO", polo: "PASSIVO" },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useUnidade as any).mockReturnValue({ unidadeSelecionada: "todas" });
    (useAuth as any).mockReturnValue({ user: { papel: "ADMINISTRADOR" } });
    (processosApi.listar as any).mockResolvedValue({ content: mockProcessos });
  });

  it("deve carregar e exibir a lista de processos", async () => {
    render(<ProcessosView />);

    expect(await screen.findByText(/Joao Silva x Banco XPTO/i)).toBeDefined();
    expect(screen.getByText(/1234567/i)).toBeDefined();
  });

  it("deve abrir o modal de novo processo ao clicar no botao", async () => {
    render(<ProcessosView />);

    fireEvent.click(screen.getByRole("button", { name: /Novo Processo/i }));

    expect(screen.getByTestId("novo-processo-modal")).toBeDefined();
  });

  it("deve filtrar processos por busca de texto", async () => {
    render(<ProcessosView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por numero ou cliente/i), {
      target: { value: "Inexistente" },
    });

    await waitFor(() => {
      expect(processosApi.listar).toHaveBeenCalledWith(expect.objectContaining({ busca: "Inexistente" }));
    });
  });

  it("deve abrir o dossie do processo ao clicar em um processo", async () => {
    render(<ProcessosView />);

    fireEvent.click(await screen.findByText(/Joao Silva x Banco XPTO/i));

    expect(await screen.findByTestId("processo-dossie-modal")).toBeDefined();
    expect(screen.getByText(/Dossie aberto: p1/i)).toBeDefined();
  });
});
