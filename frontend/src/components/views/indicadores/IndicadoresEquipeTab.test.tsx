import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IndicadoresEquipeTab } from "./IndicadoresEquipeTab";

const listarMock = vi.fn();
const evolucaoMock = vi.fn();

vi.mock("@/services/api", () => ({
  indicadoresEquipeApi: {
    listar: (...args: unknown[]) => listarMock(...args),
    evolucao: (...args: unknown[]) => evolucaoMock(...args),
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="barchart">{children}</div>
  ),
  Bar: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

describe("IndicadoresEquipeTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza ranking da equipe e detalhe do primeiro funcionario", async () => {
    listarMock.mockResolvedValue([
      {
        usuarioId: "u-1",
        nomeUsuario: "Ana Ribeiro",
        processosSobResponsabilidade: 12,
        prazosPendentes: 61,
        prazosConcluidosNoPrazo: 9,
        prazosConcluidosAtrasados: 2,
        movimentacoesRegistadas: 18,
      },
      {
        usuarioId: "u-2",
        nomeUsuario: "Bruno Lima",
        processosSobResponsabilidade: 7,
        prazosPendentes: 18,
        prazosConcluidosNoPrazo: 6,
        prazosConcluidosAtrasados: 1,
        movimentacoesRegistadas: 11,
      },
    ]);
    evolucaoMock.mockResolvedValue([
      { data: "01/04 - 07/04", tarefasConcluidas: 3 },
      { data: "08/04 - 14/04", tarefasConcluidas: 5 },
      { data: "15/04 - 21/04", tarefasConcluidas: 4 },
      { data: "22/04 - 28/04", tarefasConcluidas: 6 },
    ]);

    render(<IndicadoresEquipeTab />);

    expect(await screen.findByText("Ana Ribeiro")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
    expect(screen.getAllByText(/Carga critica/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Perfil individual do responsavel/i)).toBeInTheDocument();
    expect(await screen.findByTestId("barchart")).toBeInTheDocument();
  });

  it("mostra estado vazio quando nao existem indicadores", async () => {
    listarMock.mockResolvedValue([]);
    evolucaoMock.mockResolvedValue([]);

    render(<IndicadoresEquipeTab />);

    expect(await screen.findByText(/Nenhum indicador disponivel/i)).toBeInTheDocument();
  });
});
