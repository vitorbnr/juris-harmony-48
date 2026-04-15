import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DocumentosView } from "./DocumentosView";
import { clientesApi, documentosApi, pastasApi, processosApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  documentosApi: {
    listar: vi.fn(),
    listarPorCliente: vi.fn(),
    listarPorPasta: vi.fn(),
    listarPorProcesso: vi.fn(),
    listarAcervoClientes: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    excluirStorageKey: vi.fn(),
  },
  clientesApi: {
    listar: vi.fn(),
    desativar: vi.fn(),
  },
  processosApi: {
    listar: vi.fn(),
  },
  pastasApi: {
    listarInternas: vi.fn(),
    criarInterna: vi.fn(),
    excluirInterna: vi.fn(),
  },
}));

describe("DocumentosView", () => {
  const mockDocs = [
    {
      id: "d1",
      nome: "Contrato_Social.pdf",
      tipo: "pdf",
      tamanho: "1.2 MB",
      categoria: "contrato",
      dataUpload: "2024-01-01",
      clienteId: "c1",
      clienteNome: "Joao Leis Junior",
    },
  ];

  const mockAcervo = [
    {
      chave: "cocos::ba",
      cidade: "Cocos",
      estado: "BA",
      label: "Cocos - BA",
      totalClientes: 1,
      clientes: [{ id: "c1", nome: "Joao Leis Junior", initials: "JJ" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    (documentosApi.listar as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarPorCliente as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarPorPasta as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarAcervoClientes as any).mockResolvedValue(mockAcervo);
    (clientesApi.listar as any).mockResolvedValue({ content: [{ id: "c1", nome: "Joao Leis Junior" }] });
    (processosApi.listar as any).mockResolvedValue({ content: [] });
    (pastasApi.listarInternas as any).mockResolvedValue([]);
  });

  it("deve carregar e exibir a lista de documentos", async () => {
    render(<DocumentosView />);

    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
    expect(screen.getAllByText(/1.2 MB/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cocos - BA/i)).toBeDefined();
  });

  it("deve abrir o modal de upload ao clicar no botao", async () => {
    render(<DocumentosView />);

    fireEvent.click(screen.getByRole("button", { name: /Upload/i }));

    expect(screen.getByText(/Upload de documento/i)).toBeDefined();
  });

  it("deve filtrar documentos por busca de texto", async () => {
    render(<DocumentosView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, clientes, processos ou cidades/i), { target: { value: "Social" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, clientes, processos ou cidades/i), { target: { value: "Inexistente" } });
    expect(screen.queryByText(/Contrato_Social.pdf/i)).toBeNull();
  });

  it("deve localizar documentos por nome do cliente e da cidade", async () => {
    render(<DocumentosView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, clientes, processos ou cidades/i), { target: { value: "Joao Leis" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, clientes, processos ou cidades/i), { target: { value: "Cocos" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
  });

  it("deve permitir fechar todas as cidades da sidebar", async () => {
    const { getByTestId } = render(<DocumentosView />);
    const sidebar = getByTestId("documentos-sidebar-scroll");

    expect(await within(sidebar).findByText(/Joao Leis Junior/i)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Fechar todos/i }));
    await waitFor(() => {
      expect(within(sidebar).queryByText(/Joao Leis Junior/i)).toBeNull();
    });
  });

  it("deve localizar documento por trecho numerico do nome", async () => {
    (documentosApi.listar as any).mockResolvedValue({
      content: [
        {
          id: "local:unidade/clientes/c1/arquivo-Documento-aniversario-13.txt",
          nome: "Documento-aniversario-13.txt",
          tipo: "txt",
          tamanho: "2.0 KB",
          categoria: "outros",
          dataUpload: "2026-04-14T11:30:00",
          clienteId: "c1",
          clienteNome: "Joao Leis Junior",
        },
      ],
    });

    render(<DocumentosView />);

    expect(await screen.findByText(/Documento-aniversario-13.txt/i)).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, clientes, processos ou cidades/i), { target: { value: "13" } });
    expect(await screen.findByText(/Documento-aniversario-13.txt/i)).toBeDefined();
  });

  it("deve complementar a visao geral com os documentos demo no ambiente de teste", async () => {
    (documentosApi.listar as any).mockResolvedValue({
      content: [
        {
          id: "api-1",
          nome: "Documento API.pdf",
          tipo: "pdf",
          tamanho: "80 KB",
          categoria: "outros",
          dataUpload: "2026-04-14T09:00:00",
        },
      ],
    });

    render(<DocumentosView />);

    expect(await screen.findByText(/Documento API.pdf/i)).toBeDefined();
    expect(await screen.findByText(/Planilha de Custas.xlsx/i)).toBeDefined();
  });

  it("deve abrir o modal de edicao do documento", async () => {
    render(<DocumentosView />);

    fireEvent.click((await screen.findAllByTitle(/Editar/i))[0]);

    expect(await screen.findByText(/Editar documento/i)).toBeDefined();
  });

  it("deve excluir uma pasta interna pela sidebar", async () => {
    (pastasApi.listarInternas as any).mockResolvedValue([
      {
        id: "p1",
        nome: "Financeiro",
        parentId: null,
        children: [],
      },
    ]);
    (pastasApi.excluirInterna as any).mockResolvedValue(undefined);

    render(<DocumentosView />);

    fireEvent.click(await screen.findByLabelText(/Excluir pasta Financeiro/i));

    await waitFor(() => {
      expect(pastasApi.excluirInterna).toHaveBeenCalledWith("p1");
    });
  });

});
