export type StatusTratamentoPublicacao = "PENDENTE" | "TRATADA" | "DESCARTADA";

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
}
