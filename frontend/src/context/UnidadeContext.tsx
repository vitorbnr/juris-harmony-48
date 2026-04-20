import { createContext, useContext, useState, type ReactNode } from "react";

interface UnidadeAtual {
  id: string;
  nome?: string;
}

// IDs de unidade sao strings (UUID do backend) ou "todas"
interface UnidadeContextType {
  unidadeSelecionada: string; // "todas" | unidade.id (UUID)
  unidadeAtual?: UnidadeAtual;
  setUnidadeSelecionada: (id: string, nome?: string) => void;
}

const UnidadeContext = createContext<UnidadeContextType>({
  unidadeSelecionada: "todas",
  unidadeAtual: undefined,
  setUnidadeSelecionada: () => {},
});

export const UnidadeProvider = ({ children }: { children: ReactNode }) => {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const [unidadeAtual, setUnidadeAtual] = useState<UnidadeAtual | undefined>(undefined);

  const selecionarUnidade = (id: string, nome?: string) => {
    setUnidadeSelecionada(id);
    setUnidadeAtual(id === "todas" ? undefined : { id, nome });
  };

  return (
    <UnidadeContext.Provider value={{ unidadeSelecionada, unidadeAtual, setUnidadeSelecionada: selecionarUnidade }}>
      {children}
    </UnidadeContext.Provider>
  );
};

export const useUnidade = () => useContext(UnidadeContext);
