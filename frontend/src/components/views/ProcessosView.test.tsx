import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProcessosView } from "./ProcessosView";
import { useUnidade } from "@/context/UnidadeContext";
import { casosApi, processosApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/context/UnidadeContext", () => ({
  useUnidade: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  casosApi: {
    listar: vi.fn(),
    buscar: vi.fn(),
  },
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

vi.mock("@/components/modals/NovoCasoModal", () => ({
  NovoCasoModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="novo-caso-modal">
      <button onClick={onClose}>Fechar caso</button>
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

vi.mock("@/components/modals/CasoDetalheModal", () => ({
  CasoDetalheModal: ({
    open,
    casoId,
    onClose,
  }: {
    open: boolean;
    casoId: string | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="caso-detalhe-modal">
        <span>Caso aberto: {casoId}</span>
        <button onClick={onClose}>Fechar caso</button>
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
  const mockCasos = [
    {
      id: "caso-1",
      clienteId: "c1",
      clienteNome: "Joao Silva",
      unidadeId: "u1",
      unidadeNome: "Sede",
      responsavelId: "u-adv",
      responsavelNome: "Dr. Rafael",
      titulo: "Reestruturacao contratual do grupo",
      descricao: "Caso consultivo em fase de organizacao interna.",
      observacoes: null,
      etiquetas: ["estrategico"],
      acesso: "EQUIPE",
      envolvidos: [{ id: "env-1", nome: "Banco XPTO", qualificacao: "Contraparte" }],
      dataCriacao: "2026-04-10T10:00:00",
      dataAtualizacao: "2026-04-15T14:00:00",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useUnidade as any).mockReturnValue({ unidadeSelecionada: "todas" });
    (useAuth as any).mockReturnValue({ user: { papel: "ADMINISTRADOR" } });
    (processosApi.listar as any).mockResolvedValue({
      content: mockProcessos,
      number: 0,
      size: 40,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
    (casosApi.listar as any).mockResolvedValue({
      content: mockCasos,
      number: 0,
      size: 40,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
  });

  it("deve carregar e exibir a lista de processos", async () => {
    render(<ProcessosView />);

    expect(await screen.findByText(/Joao Silva x Banco XPTO/i)).toBeDefined();
    expect(screen.getByText(/1234567/i)).toBeDefined();
    expect(processosApi.listar).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 40 }));
  });

  it("deve abrir o modal de novo processo ao selecionar processo no menu de criacao", async () => {
    render(<ProcessosView />);

    fireEvent.click(screen.getByRole("button", { name: /Criar processo ou caso/i }));
    fireEvent.click(await screen.findByText(/^Processo$/i));

    expect(screen.getByTestId("novo-processo-modal")).toBeDefined();
  });

  it("deve abrir o modal de novo caso ao selecionar caso no menu de criacao", async () => {
    render(<ProcessosView />);

    fireEvent.click(screen.getByRole("button", { name: /Criar processo ou caso/i }));
    fireEvent.click(await screen.findByText(/^Caso$/i));

    expect(screen.getByTestId("novo-caso-modal")).toBeDefined();
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

  it("deve listar casos ao trocar para a aba de casos", async () => {
    render(<ProcessosView />);

    fireEvent.click(screen.getByRole("tab", { name: /Casos/i }));

    expect(await screen.findByText(/Reestruturacao contratual do grupo/i)).toBeDefined();
    expect(casosApi.listar).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 40 }));
  });

  it("deve abrir o detalhe do caso ao clicar em um card de caso", async () => {
    render(<ProcessosView />);

    fireEvent.click(screen.getByRole("tab", { name: /Casos/i }));
    fireEvent.click(await screen.findByText(/Reestruturacao contratual do grupo/i));

    expect(await screen.findByTestId("caso-detalhe-modal")).toBeDefined();
    expect(screen.getByText(/Caso aberto: caso-1/i)).toBeDefined();
  });
});
