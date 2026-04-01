import { createContext, useContext, useState, type ReactNode } from "react";

// IDs de unidade são strings (UUID do backend) ou "todas"
interface UnidadeContextType {
  unidadeSelecionada: string; // "todas" | unidade.id (UUID)
  setUnidadeSelecionada: (id: string) => void;
}

const UnidadeContext = createContext<UnidadeContextType>({
  unidadeSelecionada: "todas",
  setUnidadeSelecionada: () => {},
});

export const UnidadeProvider = ({ children }: { children: ReactNode }) => {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");

  return (
    <UnidadeContext.Provider value={{ unidadeSelecionada, setUnidadeSelecionada }}>
      {children}
    </UnidadeContext.Provider>
  );
};

export const useUnidade = () => useContext(UnidadeContext);
