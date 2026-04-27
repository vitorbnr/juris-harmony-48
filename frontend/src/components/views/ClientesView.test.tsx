import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClientesView } from "./ClientesView";
import { useUnidade } from "@/context/UnidadeContext";
import { clientesApi } from "@/services/api";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/context/UnidadeContext", () => ({
  useUnidade: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  clientesApi: {
    listar: vi.fn(),
  },
}));

vi.mock("@/components/modals/NovoClienteModal", () => ({
  NovoClienteModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="novo-cliente-modal"><button onClick={onClose}>Fechar</button></div>
  ),
}));

vi.mock("@/components/modals/NovoProcessoModal", () => ({
  NovoProcessoModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="novo-processo-modal"><button onClick={onClose}>Fechar</button></div>
  ),
}));

describe("ClientesView", () => {
  const mockClientes = [
    {
      id: "c1",
      nome: "Empresa Alfa",
      tipo: "PESSOA_JURIDICA",
      cpfCnpj: "12.345.678/0001-90",
      email: "alfa@empresa.com",
      telefone: "1199999999",
      cidade: "Carinhanha",
      estado: "BA",
      dataCadastro: "2024-01-01",
      unidadeId: "u1",
      unidadeNome: "Carinhanha",
      advogadoResponsavel: "Dr. Rafael",
      ativo: true,
      isFalecido: true,
      processos: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUnidade).mockReturnValue({ unidadeSelecionada: "todas" } as ReturnType<typeof useUnidade>);
    vi.mocked(clientesApi.listar).mockResolvedValue({
      content: mockClientes,
      number: 0,
      size: 40,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
  });

  it("deve carregar e exibir a lista de clientes em modo grid por padrao", async () => {
    render(<ClientesView />);
    expect(await screen.findByText(/Empresa Alfa/i)).toBeDefined();
    expect(clientesApi.listar).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 40 }));
  });

  it("deve exibir indicador visual para cliente falecido", async () => {
    render(<ClientesView />);
    expect(await screen.findByText("Falecido")).toBeDefined();
  });

  it("deve alternar para o modo lista ao clicar no botao correspondente", async () => {
    render(<ClientesView />);
    const buttons = screen.getAllByRole("button").filter((button) => button.className.includes("p-1.5"));
    if (buttons.length >= 2) {
      fireEvent.click(buttons[1]);
    }
    expect(await screen.findByText("CPF / CNPJ")).toBeDefined();
  });

  it("deve abrir o modal de novo cliente", async () => {
    render(<ClientesView />);
    fireEvent.click(screen.getByRole("button", { name: /Novo Cliente/i }));
    expect(screen.getByTestId("novo-cliente-modal")).toBeDefined();
  });

  it("deve reagir ao evento customizado open_novo_processo", async () => {
    render(<ClientesView />);
    fireEvent(window, new CustomEvent("open_novo_processo", { detail: "c1" }));
    expect(screen.getByTestId("novo-processo-modal")).toBeDefined();
  });

  it("deve enviar a busca paginada para a API", async () => {
    render(<ClientesView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome, e-mail ou CPF\/CNPJ/i), {
      target: { value: "Alfa" },
    });

    await waitFor(() => {
      expect(clientesApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({ busca: "Alfa", page: 0, size: 40 }),
      );
    });
  });
});
