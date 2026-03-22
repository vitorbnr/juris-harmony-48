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
  papel: UserRole;
  ativo: boolean;
  initials: string;
  unidadeId: string;
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export type TipoCliente = "pessoa_fisica" | "pessoa_juridica";

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
  advogadoResponsavel: string;
  initials: string;
  unidadeId: string;
}

// ─── Processos ───────────────────────────────────────────────────────────────

export type StatusProcesso =
  | "Em andamento"
  | "Aguardando"
  | "Urgente"
  | "Concluído"
  | "Suspenso"
  | "Arquivado";

export type TipoProcesso =
  | "Cível"
  | "Trabalhista"
  | "Criminal"
  | "Família"
  | "Tributário"
  | "Empresarial"
  | "Previdenciário"
  | "Administrativo";

export interface Processo {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  tipo: TipoProcesso;
  vara: string;
  tribunal: string;
  advogadoId: string;
  advogadoNome: string;
  status: StatusProcesso;
  dataDistribuicao: string;
  ultimaMovimentacao: string;
  proximoPrazo?: string;
  valorCausa?: string;
  descricao?: string;
  movimentacoes?: Movimentacao[];
  unidadeId: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  descricao: string;
  tipo: "despacho" | "sentenca" | "audiencia" | "peticao" | "publicacao" | "outro";
}

// ─── Prazos & Tarefas ────────────────────────────────────────────────────────

export type TipoPrazo = "prazo_processual" | "audiencia" | "tarefa_interna" | "reuniao";
export type PrioridadePrazo = "alta" | "media" | "baixa";

export interface Prazo {
  id: string;
  titulo: string;
  processoId?: string;
  processoNumero?: string;
  clienteNome?: string;
  data: string;
  hora?: string;
  tipo: TipoPrazo;
  prioridade: PrioridadePrazo;
  concluido: boolean;
  advogadoId?: string;
  descricao?: string;
  unidadeId?: string;
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
  clienteId?: string;
  clienteNome?: string;
  processoId?: string;
  processoNumero?: string;
  pastaId: string;
  dataUpload: string;
  uploadadoPor: string;
}

export interface Pasta {
  id: string;
  nome: string;
  clienteId?: string;
  processoId?: string;
  parentId?: string;
  documentos: number;
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
  data: string;
  hora: string;
  link?: string; // seção para navegar ao clicar
}

// ─── Logs de Auditoria ───────────────────────────────────────────────────────

export type TipoAcao = "acessou" | "criou" | "editou" | "excluiu" | "visualizou" | "fez_upload" | "baixou";
export type ModuloLog = "processos" | "clientes" | "prazos" | "documentos" | "usuarios" | "sistema" | "financeiro";

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
