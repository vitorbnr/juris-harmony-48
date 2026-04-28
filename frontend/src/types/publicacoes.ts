export type StatusTratamentoPublicacao = "PENDENTE" | "TRATADA" | "DESCARTADA";
export type LadoProcessualPublicacao = "PARTE_AUTORA" | "PARTE_RE" | "TERCEIRO" | "INDEFINIDO";
export type TipoFontePublicacaoMonitorada = "NOME" | "OAB" | "CPF" | "CNPJ";
export type GrupoDiarioOficialPublicacao = "DJEN" | "DATAJUD" | "DOMICILIO" | "DOU" | "LEGADO";
export type StatusDiarioOficialPublicacao = "SUPORTADO" | "PREPARADO" | "NAO_SUPORTADO";
export type StatusFluxoPublicacao =
  | "RECEBIDA"
  | "SEM_VINCULO"
  | "SEM_RESPONSAVEL"
  | "ATRIBUIDA"
  | "EM_TRATAMENTO"
  | "TRATADA"
  | "DESCARTADA";

export interface Publicacao {
  id: string;
  npu?: string | null;
  tribunalOrigem: string;
  teor: string;
  dataPublicacao: string;
  statusTratamento: StatusTratamentoPublicacao;
  statusFluxo?: StatusFluxoPublicacao | null;
  processoId?: string | null;
  processoNumero?: string | null;
  fonte?: string | null;
  identificadorExterno?: string | null;
  captadaEmNome?: string | null;
  oabMonitorada?: string | null;
  responsavelProcessoId?: string | null;
  responsavelProcessoNome?: string | null;
  atribuidaParaUsuarioId?: string | null;
  atribuidaParaUsuarioNome?: string | null;
  assumidaPorUsuarioId?: string | null;
  assumidaPorUsuarioNome?: string | null;
  tratadaPorUsuarioId?: string | null;
  tratadaPorUsuarioNome?: string | null;
  dataAtribuicao?: string | null;
  dataAssuncao?: string | null;
  dataTratamento?: string | null;
  motivoDescarte?: string | null;
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

export interface PublicacaoHistorico {
  id: string;
  acao: string;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  usuarioDestinoId?: string | null;
  usuarioDestinoNome?: string | null;
  observacao?: string | null;
  criadoEm: string;
}

export interface PublicacaoFonteMonitorada {
  id: string;
  tipo: TipoFontePublicacaoMonitorada;
  nomeExibicao: string;
  valorMonitorado: string;
  uf?: string | null;
  observacao?: string | null;
  ativo: boolean;
  destinatarios?: PublicacaoDestinatario[];
  diariosMonitorados?: PublicacaoDiarioOficial[];
  abrangenciaResumo?: string | null;
  criadoPorUsuarioId?: string | null;
  criadoPorUsuarioNome?: string | null;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
}

export interface PublicacaoDestinatario {
  id: string;
  nome: string;
  email?: string | null;
  papel?: string | null;
}

export interface PublicacaoDiarioOficial {
  id: string;
  codigo: string;
  nome: string;
  uf?: string | null;
  grupo: GrupoDiarioOficialPublicacao;
  estrategiaColeta: string;
  status: StatusDiarioOficialPublicacao;
  coletavelAgora?: boolean;
  statusCaptura?: string | null;
  requerScraping: boolean;
  custoEstimado?: string | null;
  observacao?: string | null;
  ativo: boolean;
}

export interface PublicacaoCapturaExecucao {
  id: string;
  fonte?: string | null;
  diarioCodigo?: string | null;
  dataReferencia?: string | null;
  status?: string | null;
  cadernosConsultados?: number | null;
  cadernosBaixados?: number | null;
  publicacoesLidas?: number | null;
  publicacoesImportadas?: number | null;
  falhas?: number | null;
  mensagem?: string | null;
  iniciadoEm?: string | null;
  finalizadoEm?: string | null;
  duracaoMs?: number | null;
}

export interface PublicacaoMonitoramento {
  fontesMonitoradas: number;
  fontesAtivas: number;
  publicacoesPendentes: number;
  publicacoesSemVinculo: number;
  publicacoesSemResponsavel: number;
  datajud?: PublicacaoFonteSaude | null;
  djen?: PublicacaoFonteSaude | null;
  dou?: PublicacaoFonteSaude | null;
  orientacaoOperacional?: string | null;
}

export interface PublicacaoDjenSync {
  enabled: boolean;
  tribunais: string[];
  diasAvaliados: number;
  cadernosConsultados: number;
  cadernosBaixados: number;
  publicacoesLidas: number;
  publicacoesImportadas: number;
  falhas: number;
  mensagem?: string | null;
}

export interface PublicacaoDouSync {
  enabled: boolean;
  configurada: boolean;
  secoes: string[];
  diasAvaliados: number;
  cadernosConsultados: number;
  cadernosBaixados: number;
  publicacoesLidas: number;
  publicacoesImportadas: number;
  falhas: number;
  mensagem?: string | null;
}

export interface PublicacaoFonteSaude {
  fonte: string;
  status: string;
  configurada: boolean;
  monitorados: number;
  saudaveis: number;
  comErro: number;
  ultimoSyncEm?: string | null;
  proximoSyncEm?: string | null;
  mensagem?: string | null;
}

export interface PublicacaoMetricas {
  naoTratadasHoje: number;
  tratadasHoje: number;
  descartadasHoje: number;
  naoTratadas: number;
  prazoSuspeito: number;
  semVinculo: number;
  semResponsavel: number;
}
