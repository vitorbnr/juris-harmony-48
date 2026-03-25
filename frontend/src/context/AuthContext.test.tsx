import { render, screen, act, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import api from "@/lib/api";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock da API
vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock do window.location
const mockHref = vi.fn();
delete (window as any).location;
(window as any).location = { href: "" };

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "1",
    nome: "Teste",
    email: "teste@viana.com.br",
    papel: "ADMINISTRADOR",
    unidadeId: "uuid-unidade",
    unidadeNome: "Sede",
  };

  it("deve carregar o usuário do localStorage na inicialização", async () => {
    localStorage.setItem("accessToken", "token-123");
    localStorage.setItem("user", JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Como o useEffect roda na montagem, esperamos o estado atualizar
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("deve realizar login com sucesso e salvar no localStorage", async () => {
    const loginResponse = {
      data: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        usuario: mockUser,
      },
    };

    (api.post as any).mockResolvedValue(loginResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login("teste@viana.com.br", "senha123");
    });

    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem("accessToken")).toBe("new-access-token");
    expect(localStorage.getItem("user")).toBe(JSON.stringify(mockUser));
  });

  it("deve realizar logout, limpar localStorage e redirecionar", async () => {
    localStorage.setItem("accessToken", "token");
    localStorage.setItem("user", JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    (api.post as any).mockResolvedValue({});

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});
