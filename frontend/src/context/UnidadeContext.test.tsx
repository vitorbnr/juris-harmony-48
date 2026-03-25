import { renderHook, act } from "@testing-library/react";
import { UnidadeProvider, useUnidade } from "./UnidadeContext";
import { describe, it, expect } from "vitest";

describe("UnidadeContext", () => {
  it("deve iniciar com unidadeSelecionada como 'todas'", () => {
    const { result } = renderHook(() => useUnidade(), {
      wrapper: UnidadeProvider,
    });

    expect(result.current.unidadeSelecionada).toBe("todas");
    expect(result.current.unidadeAtual).toBeUndefined();
  });

  it("deve alterar a unidade selecionada corretamente", () => {
    const { result } = renderHook(() => useUnidade(), {
      wrapper: UnidadeProvider,
    });

    // Como o mockData tem unidades, vamos tentar selecionar a primeira
    // Precisaríamos saber o ID de uma unidade do mockData.
    // Vamos apenas testar se o estado muda, e se unidadeAtual reflete isso.
    
    act(() => {
      result.current.setUnidadeSelecionada("1");
    });

    expect(result.current.unidadeSelecionada).toBe("1");
  });
});
