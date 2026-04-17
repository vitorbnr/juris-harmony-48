// ─── Unidades ────────────────────────────────────────────────────────────────

export interface Unidade {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
}

// ─── Usuários ────────────────────────────────────────────────────────────────

export type UserRole = "administrador" | "advogado" | "secretaria";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  oab?: string;
  cpf?: string;
  habilitadoDomicilio?: boolean;
  papel: UserRole;
  ativo: boolean;
  initials: string;
  unidadeId: string;
  unidadeNome?: string;
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export type TipoCliente =
  | "pessoa_fisica"
  | "pessoa_juridica"
  | "PESSOA_FISICA"
  | "PESSOA_JURIDICA";

export type TipoContaBancaria = "CORRENTE" | "POUPANCA";

export interface Cliente {
  id: string;
  nome: string;
  tipo: TipoCliente;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  dataCadastro: string;
  processos: number;
  advogadoId?: string | null;
  advogadoResponsavel: string;
  initials: string;
  unidadeId: string;
  unidadeNome?: string | null;
  ativo?: boolean;
  rg?: string;
  ctps?: string;
  pis?: string;
  tituloEleitorNumero?: string;
  tituloEleitorZona?: string;
  tituloEleitorSessao?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  cnhVencimento?: string;
  passaporteNumero?: string;
  certidaoReservistaNumero?: string;
  dataNascimento?: string;
  nomePai?: string;
  nomeMae?: string;
  naturalidade?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  empresa?: string;
  atividadeEconomica?: string;
  comentarios?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  bancoTipo?: TipoContaBancaria | "";
  chavePix?: string;
  isFalecido?: boolean;
  detalhesObito?: string;
}

export type StatusAtendimento = "ABERTO" | "EM_ANALISE" | "CONVERTIDO" | "ARQUIVADO";

export interface Atendimento {
  id: string;
  clienteId: string;
  clienteNome: string;
  usuarioId: string;
  usuarioNome: string;
  unidadeId?: string | null;
  unidadeNome?: string | null;
  processoId?: string | null;
  processoNumero?: string | null;
  vinculoTipo?: "PROCESSO" | "CASO" | "ATENDIMENTO" | null;
  vinculoReferenciaId?: string | null;
  assunto: string;
  descricao?: string | null;
  status: StatusAtendimento;
  etiquetas: string[];
  dataCriacao: string;
  dataAtualizacao: string;
}

// ─── Processos ───────────────────────────────────────────────────────────────

export type StatusProcesso =
  | "EM_ANDAMENTO"
  | "AGUARDANDO"
  | "URGENTE"
  | "CONCLUIDO"
  | "SUSPENSO"
  | "ARQUIVADO";

export type TipoProcesso =
  | "CIVEL"
  | "TRABALHISTA"
  | "CRIMINAL"
  | "FAMILIA"
  | "TRIBUTARIO"
  | "EMPRESARIAL"
  | "PREVIDENCIARIO"
  | "ADMINISTRATIVO";

export interface Processo {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  tipo: TipoProcesso;
  vara: string;
  tribunal: string;
  /** Lista completa de advogados responsáveis */
  advogados?: { id: string; nome: string }[];
  /** Compat: primeiro advogado da lista (pode ser null) */
  advogadoId?: string;
  advogadoNome?: string;
  status: StatusProcesso;
  dataDistribuicao: string;
  ultimaMovimentacao: string;
  proximoPrazo?: string;
  valorCausa?: string;
  descricao?: string;
  etiquetas?: string[];
  partes?: ProcessoParte[];
  movimentacoes?: Movimentacao[];
  unidadeId: string;
  unidadeNome?: string;
}

export interface ProcessoParte {
  id: string;
  nome: string;
  documento?: string;
  tipo?: string;
  polo?: string;
  principal?: boolean;
  observacao?: string;
  representantes?: ProcessoParteRepresentante[];
}

export interface ProcessoParteRepresentante {
  id: string;
  nome: string;
  cpf?: string;
  oab?: string;
  principal?: boolean;
  usuarioInternoId?: string;
  usuarioInternoNome?: string;
}

export interface ProcessoParteFormValue {
  nome: string;
  documento: string;
  tipo: string;
  polo: string;
  principal: boolean;
  observacao: string;
  representantes: ProcessoParteRepresentanteFormValue[];
}

export interface ProcessoParteRepresentanteFormValue {
  nome: string;
  cpf: string;
  oab: string;
  principal: boolean;
  usuarioInternoId: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  dataHora?: string;
  descricao: string;
  tipo: string;
  origem?: string;
  orgaoJulgador?: string;
}

export type FonteEventoJuridico = "DATAJUD" | "DOMICILIO" | "DJEN";
export type TipoEventoJuridico = "MOVIMENTACAO" | "PUBLICACAO" | "INTIMACAO";
export type StatusEventoJuridico = "NOVO" | "EM_TRIAGEM" | "CONCLUIDO" | "ARQUIVADO";

export interface EventoJuridico {
  id: string;
  processoId?: string;
  processoNumero?: string;
  clienteNome?: string;
  fonte: FonteEventoJuridico;
  tipo: TipoEventoJuridico;
  status: StatusEventoJuridico;
  titulo: string;
  descricao: string;
  orgaoJulgador?: string;
  referenciaExterna?: string;
  linkOficial?: string;
  destinatario?: string;
  parteRelacionada?: string;
  dataEvento?: string;
  responsavelId?: string;
  responsavelNome?: string;
  criadoEm: string;
}

// ─── Prazos & Tarefas ────────────────────────────────────────────────────────

export type TipoPrazo = "prazo_processual" | "audiencia" | "tarefa_interna" | "reuniao";
export type PrioridadePrazo = "alta" | "media" | "baixa";
export type EtapaPrazo = "a_fazer" | "em_andamento" | "concluido";
export type ModalidadeAtividade = "presencial" | "online" | "hibrido";
export type TipoUnidadeAlertaPrazo = "horas" | "dias";
export type TipoVinculoPrazo = "processo" | "caso" | "atendimento";

export interface ParticipantePrazo {
  id: string;
  nome: string;
}

export interface Prazo {
  id: string;
  titulo: string;
  processoId?: string;
  eventoJuridicoId?: string;
  processoNumero?: string;
  clienteNome?: string;
  data: string;
  hora?: string;
  dataFim?: string | null;
  horaFim?: string | null;
  diaInteiro?: boolean;
  tipo: TipoPrazo;
  prioridade: PrioridadePrazo;
  etapa?: EtapaPrazo;
  concluido: boolean;
  advogadoId?: string;
  advogadoNome?: string;
  participantes?: ParticipantePrazo[];
  etiqueta?: string | null;
  descricao?: string;
  local?: string | null;
  modalidade?: ModalidadeAtividade | null;
  sala?: string | null;
  alertaValor?: number | null;
  alertaUnidade?: TipoUnidadeAlertaPrazo | null;
  vinculoTipo?: TipoVinculoPrazo | null;
  vinculoReferenciaId?: string | null;
  quadroKanban?: string | null;
  unidadeId?: string;
}

export interface PrazoDetalheProcesso {
  id: string;
  numero?: string | null;
  clienteNome?: string | null;
  tribunal?: string | null;
  vara?: string | null;
}

export interface PrazoDetalheEventoJuridico {
  id: string;
  fonte?: string | null;
  tipo?: string | null;
  status?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  orgaoJulgador?: string | null;
  referenciaExterna?: string | null;
  linkOficial?: string | null;
  destinatario?: string | null;
  parteRelacionada?: string | null;
  dataEvento?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  criadoEm?: string | null;
}

export interface PrazoComentario {
  id: string;
  conteudo: string;
  criadoEm?: string | null;
  autorId?: string | null;
  autorNome?: string | null;
}

export interface PrazoHistorico {
  id: string;
  descricao: string;
  acao?: string | null;
  usuarioNome?: string | null;
  dataHora?: string | null;
}

export interface PrazoDetalhe {
  prazo: Prazo;
  criadoEm?: string | null;
  criadoPorNome?: string | null;
  unidadeNome?: string | null;
  processo?: PrazoDetalheProcesso | null;
  eventoJuridico?: PrazoDetalheEventoJuridico | null;
  comentarios: PrazoComentario[];
  historico: PrazoHistorico[];
}

export interface NotaPessoal {
  id?: string | null;
  conteudo: string;
  dataAtualizacao?: string | null;
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export type TipoDocumento = "pdf" | "docx" | "xlsx" | "jpg" | "png" | "outro";
export type CategoriaDocumento = "peticao" | "contrato" | "procuracao" | "sentenca" | "recurso" | "comprovante" | "outros";

export interface Documento {
  id: string;
  nome: string;
  tipo: TipoDocumento;
  categoria: CategoriaDocumento;
  tamanho: string;
  tamanhoBytes?: number;
  clienteId?: string;
  clienteNome?: string;
  processoId?: string;
  processoNumero?: string;
  pastaId?: string;
  dataUpload: string;
  uploadedPor?: string;
}

export interface Pasta {
  id: string;
  nome: string;
  clienteId?: string;
  processoId?: string;
  parentId?: string;
  documentos: number;
}

export interface AcervoClienteDocumento {
  id: string;
  nome: string;
  initials: string;
}

export interface AcervoCidadeDocumento {
  chave: string;
  cidade: string;
  estado: string;
  label: string;
  totalClientes: number;
  clientes: AcervoClienteDocumento[];
}

export interface PastaInternaNode {
  id: string;
  nome: string;
  parentId?: string | null;
  children: PastaInternaNode[];
}

// ─── Financeiro ──────────────────────────────────────────────────────────────

export type TipoHonorario = "fixo" | "parcelado" | "recorrente" | "risco";
export type StatusHonorario = "ativo" | "pago" | "em_atraso" | "pendente";

export interface Honorario {
  id: string;
  clienteId: string;
  clienteNome: string;
  processoId?: string;
  processoNumero?: string;
  tipo: TipoHonorario;
  valorTotal: number;
  percentual?: number; // para tipo "risco"
  parcelasPagas: number;
  parcelasTotal: number;
  valorParcela?: number;
  status: StatusHonorario;
  dataInicio: string;
  proximoVencimento?: string;
  unidadeId: string;
}

export type TipoCusta = "distribuicao" | "pericia" | "diligencia" | "certidao" | "publicacao" | "outros";

export interface CustaProcessual {
  id: string;
  processoId: string;
  processoNumero: string;
  clienteNome: string;
  descricao: string;
  tipo: TipoCusta;
  valor: number;
  data: string;
  pagoBy: string; // quem pagou
  reembolsavel: boolean;
  reembolsado: boolean;
  unidadeId: string;
}

export type TipoLancamento = "entrada" | "saida";
export type CategoriaLancamento =
  | "honorario" | "custa" | "reembolso" | "salario"
  | "aluguel" | "material" | "servico" | "outros";

export interface LancamentoFinanceiro {
  id: string;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  descricao: string;
  valor: number;
  data: string;
  vinculoId?: string; // processoId ou clienteId
  unidadeId: string;
}

// ─── Notificações ─────────────────────────────────────────────────────────────

export type TipoNotificacao = "prazo" | "sistema" | "financeiro" | "documento";

export interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criadaEm: string;
  link?: string; // seção para navegar ao clicar
}

// ─── Logs de Auditoria ───────────────────────────────────────────────────────

export type TipoAcao = "acessou" | "criou" | "editou" | "excluiu" | "visualizou" | "fez_upload" | "baixou";
export type ModuloLog = "atendimentos" | "processos" | "clientes" | "prazos" | "documentos" | "usuarios" | "sistema" | "financeiro";

export interface LogAuditoria {
  id: string;
  usuarioNome: string;
  usuarioPapel: UserRole;
  acao: TipoAcao;
  modulo: ModuloLog;
  descricao: string;
  data: string;
  hora: string;
  ip: string;
}
