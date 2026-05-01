import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NovoProcessoModal } from "./NovoProcessoModal";

const { toast, processosApi, clientesApi, unidadesApi, usuariosApi, casosApi } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  processosApi: {
    criar: vi.fn(),
    consultarCapaDatajud: vi.fn(),
  },
  clientesApi: {
    listar: vi.fn(),
  },
  unidadesApi: {
    listar: vi.fn(),
  },
  usuariosApi: {
    listar: vi.fn(),
  },
  casosApi: {
    listar: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      unidadeId: "un1",
    },
  }),
}));

vi.mock("@/services/api", () => ({
  processosApi,
  clientesApi,
  unidadesApi,
  usuariosApi,
  casosApi,
}));

vi.mock("sonner", () => ({
  toast,
}));

describe("NovoProcessoModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientesApi.listar.mockResolvedValue({ content: [{ id: "c1", nome: "Cliente 1" }] });
    unidadesApi.listar.mockResolvedValue([{ id: "un1", nome: "Sede" }]);
    usuariosApi.listar.mockResolvedValue([{ id: "a1", nome: "Dr. Joao", papel: "ADVOGADO" }]);
    casosApi.listar.mockResolvedValue({ content: [] });
    processosApi.criar.mockResolvedValue({ id: "p1" });
  });

  it("deve impedir cadastro sem advogado responsavel", async () => {
    render(<NovoProcessoModal onClose={vi.fn()} onSaved={vi.fn()} initialClienteId="c1" />);

    fireEvent.change(
      screen.getByPlaceholderText("Ex: 0000000-00.0000.0.00.0000"),
      { target: { value: "12345678901234567890" } },
    );

    fireEvent.click(screen.getByRole("button", { name: /Cadastrar Processo/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Selecione ao menos um advogado responsável.");
    });

    expect(processosApi.criar).not.toHaveBeenCalled();
    expect(screen.getByText("Selecione ao menos um advogado responsável.")).toBeInTheDocument();
  });
});
