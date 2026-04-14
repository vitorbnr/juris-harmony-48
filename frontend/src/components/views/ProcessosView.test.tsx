import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProcessosView } from "./ProcessosView";
import { useUnidade } from "@/context/UnidadeContext";
import { documentosApi, processosApi } from "@/services/api";
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
  documentosApi: {
    listarPorProcesso: vi.fn(),
    downloadUrl: vi.fn(),
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
      clienteNome: "Joao Silva",
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
    (useAuth as any).mockReturnValue({ user: { papel: "ADMINISTRADOR" } });
    (processosApi.listar as any).mockResolvedValue({ content: mockProcessos });
    (processosApi.buscar as any).mockResolvedValue(mockProcessos[0]);
    (documentosApi.listarPorProcesso as any).mockResolvedValue({ content: [] });
  });

  it("deve carregar e exibir a lista de processos", async () => {
    render(<ProcessosView />);

    expect(await screen.findByText(/Joao Silva/i)).toBeDefined();
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

  it("deve exibir o drawer de detalhes ao clicar em um processo", async () => {
    render(<ProcessosView />);

    fireEvent.click(await screen.findByText(/Joao Silva/i));

    expect(await screen.findByText(/Dados do Processo/i)).toBeDefined();
    expect(await screen.findByText(/1234567-89.2024.8.26.0100/i)).toBeDefined();
  });

  it("deve carregar documentos do processo ao abrir o drawer", async () => {
    (documentosApi.listarPorProcesso as any).mockResolvedValue({
      content: [
        {
          id: "d1",
          nome: "Peticao Inicial.pdf",
          tipo: "pdf",
          categoria: "peticao",
          tamanho: "245 KB",
          dataUpload: "2026-04-14T10:00:00",
          processoId: "p1",
          processoNumero: "1234567-89.2024.8.26.0100",
        },
      ],
    });

    render(<ProcessosView />);

    fireEvent.click(await screen.findByText(/Joao Silva/i));

    expect(await screen.findByText(/Peticao Inicial.pdf/i)).toBeDefined();
    expect(documentosApi.listarPorProcesso).toHaveBeenCalledWith("p1", { size: 1000 });
  });
});
