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
  data: string; // "YYYY-MM-DD"
  hora?: string; // "HH:mm"
  tipo: TipoPrazo;
  prioridade: PrioridadePrazo;
  concluido: boolean;
  advogadoId?: string;
  descricao?: string;
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

// ─── Logs de Auditoria ───────────────────────────────────────────────────────

export type TipoAcao = "acessou" | "criou" | "editou" | "excluiu" | "visualizou" | "fez_upload" | "baixou";
export type ModuloLog = "processos" | "clientes" | "prazos" | "documentos" | "usuarios" | "sistema";

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
