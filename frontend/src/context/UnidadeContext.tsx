import { createContext, useContext, useState, type ReactNode } from "react";
import { unidades } from "@/data/mockData";
import type { Unidade } from "@/types";

interface UnidadeContextType {
  unidadeSelecionada: string; // "todas" | unidade.id
  setUnidadeSelecionada: (id: string) => void;
  unidadeAtual: Unidade | undefined;
}

const UnidadeContext = createContext<UnidadeContextType>({
  unidadeSelecionada: "todas",
  setUnidadeSelecionada: () => {},
  unidadeAtual: undefined,
});

export const UnidadeProvider = ({ children }: { children: ReactNode }) => {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const unidadeAtual = unidades.find(u => u.id === unidadeSelecionada);

  return (
    <UnidadeContext.Provider value={{ unidadeSelecionada, setUnidadeSelecionada, unidadeAtual }}>
      {children}
    </UnidadeContext.Provider>
  );
};

export const useUnidade = () => useContext(UnidadeContext);
