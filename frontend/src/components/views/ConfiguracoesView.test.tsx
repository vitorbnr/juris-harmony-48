import { render, screen, fireEvent } from "@testing-library/react";
import { ConfiguracoesView } from "./ConfiguracoesView";
import { useAuth } from "@/context/AuthContext";
import { usuariosApi, logsApi } from "@/services/api";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";

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
    id: "1", // Adicionado para evitar o warning de "unique key prop" no TabEquipe e TabLogs
    nome: "Admin Teste",
    cargo: "Administrador",
    papel: "ADMINISTRADOR",
    initials: "AT",
    email: "admin@viana.com.br",
    unidadeNome: "Sede",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Substituímos o 'any' pelo tipo 'Mock' nativo do Vitest
    (useAuth as Mock).mockReturnValue({ user: mockUser });
    (usuariosApi.listar as Mock).mockResolvedValue({ content: [mockUser] });
    (logsApi.listar as Mock).mockResolvedValue({ content: [] });
  });

  it("deve renderizar a aba Perfil por padrão", () => {
    render(<ConfiguracoesView />);
    expect(screen.getByText("Admin Teste")).toBeDefined();
    
    // Agora que o input tem o ID e a Label o htmlFor, podemos usar a query correta de acessibilidade
    expect(screen.getByLabelText(/Nome Completo/i)).toBeDefined();
  });

  it("deve exibir as abas Equipe e Logs para Administradores", () => {
    render(<ConfiguracoesView />);
    expect(screen.getByRole("button", { name: /Equipe/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Logs de Acesso/i })).toBeDefined();
  });

  it("não deve exibir as abas Equipe e Logs para Advogados", () => {
    // Substituímos o 'any' pelo tipo 'Mock' nativo do Vitest
    (useAuth as Mock).mockReturnValue({ user: { ...mockUser, papel: "ADVOGADO" } });
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