import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock das dependências
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Login Page", () => {
  const mockLogin = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ login: mockLogin });
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it("deve renderizar os campos de email e senha", () => {
    render(<Login />);
    expect(screen.getByLabelText(/E-mail/i)).toBeDefined();
    expect(screen.getByLabelText(/Senha/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeDefined();
  });

  it("deve chamar a função de login com as credenciais corretas", async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "teste@viana.com.br" } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: "senha123" } });
    
    mockLogin.mockResolvedValueOnce({});
    
    const submitButton = screen.getByRole("button", { name: /Entrar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("teste@viana.com.br", "senha123");
      expect(toast.success).toHaveBeenCalledWith("Login realizado com sucesso!");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("deve exibir erro se o login falhar", async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "errado@viana.com.br" } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: "errada" } });
    
    const errorResponse = {
      response: { data: { mensagem: "Credenciais inválidas" } }
    };
    mockLogin.mockRejectedValueOnce(errorResponse);
    
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Credenciais inválidas");
    });
  });
});
