import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentosView } from "./DocumentosView";
import { documentosApi } from "@/services/api";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/services/api", () => ({
  documentosApi: {
    listar: vi.fn(),
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
      dataCriacao: "2024-01-01",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (documentosApi.listar as any).mockResolvedValue({ content: mockDocs });
  });

  it("deve carregar e exibir a lista de documentos", async () => {
    render(<DocumentosView />);
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
    expect(screen.getByText(/1.2 MB/i)).toBeDefined();
  });

  it("deve abrir o modal de upload ao clicar no botão", async () => {
    render(<DocumentosView />);
    
    const btnUpload = screen.getByRole("button", { name: /Upload/i });
    fireEvent.click(btnUpload);
    
    expect(screen.getByText(/Upload de Documentos/i)).toBeDefined();
  });

  it("deve filtrar documentos por busca de texto", async () => {
    render(<DocumentosView />);
    
    const inputBusca = screen.getByPlaceholderText(/Buscar documentos/i);
    fireEvent.change(inputBusca, { target: { value: "Social" } });
    
    expect(await screen.findByText(/Contrato_Social.pdf/i)).toBeDefined();
    
    fireEvent.change(inputBusca, { target: { value: "Inexistente" } });
    expect(screen.queryByText(/Contrato_Social.pdf/i)).toBeNull();
  });
});
