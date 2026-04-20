import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NovoAtendimentoModal } from "./NovoAtendimentoModal";

const { atendimentosApi, clientesApi, processosApi, toast } = vi.hoisted(() => ({
  atendimentosApi: {
    criar: vi.fn(),
    atualizar: vi.fn(),
  },
  clientesApi: {
    listar: vi.fn(),
  },
  processosApi: {
    listar: vi.fn(),
  },
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "adv-cocos",
      nome: "Dr. Cocos",
      unidadeId: "u-cocos",
    },
  }),
}));

vi.mock("@/services/api", () => ({
  atendimentosApi,
  clientesApi,
  processosApi,
}));

vi.mock("sonner", () => ({
  toast,
}));

describe("NovoAtendimentoModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientesApi.listar.mockResolvedValue({
      content: [{ id: "cliente-global", nome: "Cliente Global", cpfCnpj: "123.456.789-00" }],
    });
    processosApi.listar.mockResolvedValue({ content: [] });
    atendimentosApi.criar.mockResolvedValue({ id: "at1" });
    atendimentosApi.atualizar.mockResolvedValue({ id: "at1" });
  });

  it("carrega todos os clientes sem filtrar pela unidade do advogado", async () => {
    render(<NovoAtendimentoModal onClose={vi.fn()} onSaved={vi.fn()} />);

    await waitFor(() => {
      expect(clientesApi.listar).toHaveBeenCalledWith({ size: 1000 });
    });
  });

  it("carrega processos do cliente sem filtrar por unidade", async () => {
    render(
      <NovoAtendimentoModal
        onClose={vi.fn()}
        onSaved={vi.fn()}
        initialData={{
          id: "at1",
          clienteId: "cliente-global",
          clienteNome: "Cliente Global",
          usuarioId: "adv-cocos",
          usuarioNome: "Dr. Cocos",
          unidadeId: "u-cocos",
          unidadeNome: "Cocos",
          processoId: null,
          processoNumero: null,
          vinculoTipo: null,
          vinculoReferenciaId: null,
          assunto: "Consulta inicial",
          descricao: "",
          status: "ABERTO",
          etiquetas: [],
          dataCriacao: "2026-04-20T10:00:00",
          dataAtualizacao: "2026-04-20T10:00:00",
        } as never}
      />,
    );

    await waitFor(() => {
      expect(processosApi.listar).toHaveBeenCalledWith({
        clienteId: "cliente-global",
        size: 100,
      });
    });
  });
});
