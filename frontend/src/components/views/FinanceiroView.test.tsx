import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FinanceiroView } from "./FinanceiroView";
import { useUnidade } from "@/context/UnidadeContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks
vi.mock("@/context/UnidadeContext", () => ({
  useUnidade: vi.fn(),
}));

// Mock do Recharts (frequentemente causa problemas no JSDOM)
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="barchart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe("FinanceiroView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUnidade as any).mockReturnValue({ unidadeSelecionada: "todas" });
  });

  it("deve renderizar a aba de Honorários por padrão", () => {
    render(<FinanceiroView />);
    expect(screen.getByText(/A Receber/i)).toBeDefined();
    expect(screen.getByText(/Honorários/i)).toBeDefined();
  });

  it("deve alternar para a aba de Custas Processuais", () => {
    render(<FinanceiroView />);
    
    const btnCustas = screen.getByRole("button", { name: /Custas Processuais/i });
    fireEvent.click(btnCustas);
    
    expect(screen.getByText(/Total Desembolsado/i)).toBeDefined();
    // 'A Reembolsar' aparece tanto no card (p) quanto na tabela (span)
    const elements = screen.getAllByText(/A Reembolsar/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("deve alternar para a aba de Fluxo de Caixa e exibir gráfico (mockado)", () => {
    render(<FinanceiroView />);
    
    const btnFluxo = screen.getByRole("button", { name: /Fluxo de Caixa/i });
    fireEvent.click(btnFluxo);
    
    expect(screen.getByText(/Saldo do Mês/i)).toBeDefined();
    expect(screen.getByTestId("barchart")).toBeDefined();
  });
});
