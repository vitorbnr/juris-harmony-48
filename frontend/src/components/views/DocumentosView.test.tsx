import { fireEvent, render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DocumentosView } from "./DocumentosView";
import { clientesApi, documentosApi, pastasApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  documentosApi: {
    listar: vi.fn(),
    listarPorCliente: vi.fn(),
    listarPorPasta: vi.fn(),
    listarAcervoClientes: vi.fn(),
  },
  clientesApi: {
    listar: vi.fn(),
  },
  pastasApi: {
    listarInternas: vi.fn(),
    criarInterna: vi.fn(),
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
    (documentosApi.listar as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarPorCliente as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarPorPasta as any).mockResolvedValue({ content: mockDocs });
    (documentosApi.listarAcervoClientes as any).mockResolvedValue(mockAcervo);
    (clientesApi.listar as any).mockResolvedValue({ content: [{ id: "c1", nome: "Joao Leis Junior" }] });
    (pastasApi.listarInternas as any).mockResolvedValue([]);
  });

  it("deve carregar e exibir a lista de documentos", async () => {
    render(<DocumentosView />);

    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
    expect(screen.getByText(/1.2 MB/i)).toBeDefined();
    expect(screen.getByText(/Cocos - BA/i)).toBeDefined();
  });

  it("deve abrir o modal de upload ao clicar no botao", async () => {
    render(<DocumentosView />);

    fireEvent.click(screen.getByRole("button", { name: /Upload/i }));

    expect(screen.getByText(/Upload de documento/i)).toBeDefined();
  });

  it("deve filtrar documentos por busca de texto", async () => {
    render(<DocumentosView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, cidades ou clientes/i), { target: { value: "Social" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, cidades ou clientes/i), { target: { value: "Inexistente" } });
    expect(screen.queryByText(/Contrato_Social.pdf/i)).toBeNull();
  });

  it("deve localizar documentos por nome do cliente e da cidade", async () => {
    render(<DocumentosView />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, cidades ou clientes/i), { target: { value: "Joao Leis" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, cidades ou clientes/i), { target: { value: "Cocos" } });
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
  });

  it("deve permitir fechar todas as cidades da sidebar", async () => {
    render(<DocumentosView />);

    expect(await screen.findByRole("button", { name: /Joao Leis Junior/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Fechar todos/i }));
    expect(screen.queryByRole("button", { name: /Joao Leis Junior/i })).toBeNull();
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
    fireEvent.change(screen.getByPlaceholderText(/Buscar documentos, cidades ou clientes/i), { target: { value: "13" } });
    expect(await screen.findByText(/Documento-aniversario-13.txt/i)).toBeDefined();
  });
});
