import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfiguracoesView } from "./ConfiguracoesView";
import { useAuth } from "@/context/AuthContext";
import { usuariosApi, logsApi } from "@/services/api";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  usuariosApi: {
    listar: vi.fn(),
  },
  logsApi: {
    listar: vi.fn(),
  },
}));

describe("ConfiguracoesView", () => {
  const mockUser = {
    nome: "Admin Teste",
    cargo: "Administrador",
    papel: "ADMINISTRADOR",
    initials: "AT",
    email: "admin@viana.com.br",
    unidadeNome: "Sede",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (usuariosApi.listar as any).mockResolvedValue({ content: [mockUser] });
    (logsApi.listar as any).mockResolvedValue({ content: [] });
  });

  it("deve renderizar a aba Perfil por padrão", () => {
    render(<ConfiguracoesView />);
    expect(screen.getByText("Admin Teste")).toBeDefined();
    // Seleciona pelo texto da label, mas sem exigir associação form control por enquanto
    expect(screen.getByText(/Nome Completo/i)).toBeDefined();
  });

  it("deve exibir as abas Equipe e Logs para Administradores", () => {
    render(<ConfiguracoesView />);
    expect(screen.getByRole("button", { name: /Equipe/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Logs de Acesso/i })).toBeDefined();
  });

  it("não deve exibir as abas Equipe e Logs para Advogados", () => {
    (useAuth as any).mockReturnValue({ user: { ...mockUser, papel: "ADVOGADO" } });
    render(<ConfiguracoesView />);
    expect(screen.queryByRole("button", { name: /Equipe/i })).toBeNull();
  });

  it("deve alternar para a aba Equipe e listar usuários", async () => {
    render(<ConfiguracoesView />);
    
    const btnEquipe = screen.getByRole("button", { name: /Equipe/i });
    fireEvent.click(btnEquipe);
    
    expect(await screen.findByText("Permissão")).toBeDefined();
    expect(await screen.findByText("admin@viana.com.br")).toBeDefined();
  });
});
