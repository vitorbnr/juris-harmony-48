export type StatusTratamentoPublicacao = "PENDENTE" | "TRATADA" | "DESCARTADA";
export type LadoProcessualPublicacao = "PARTE_AUTORA" | "PARTE_RE" | "TERCEIRO" | "INDEFINIDO";

export interface Publicacao {
  id: string;
  npu?: string | null;
  tribunalOrigem: string;
  teor: string;
  dataPublicacao: string;
  statusTratamento: StatusTratamentoPublicacao;
  processoId?: string | null;
  processoNumero?: string | null;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
  iaAcaoSugerida?: string | null;
  iaPrazoSugeridoDias?: number | null;
  resumoOperacional?: string | null;
  riscoPrazo?: boolean | null;
  scorePrioridade?: number | null;
  justificativaPrioridade?: string | null;
  iaConfianca?: number | null;
  iaTrechosRelevantes?: string | null;
  ladoProcessualEstimado?: LadoProcessualPublicacao | null;
}

export interface PublicacaoMetricas {
  naoTratadasHoje: number;
  tratadasHoje: number;
  descartadasHoje: number;
  naoTratadas: number;
  prazoSuspeito: number;
  semVinculo: number;
}
