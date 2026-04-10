import api from "@/lib/api";
import type { Processo } from "@/types";

type ApiParams = Record<string, unknown>;

export interface DatajudCapaResponse {
  numeroCnj: string | null;
  classe: string | null;
  assunto: string | null;
  tribunal: string | null;
  orgaoJulgador: string | null;
  dataDistribuicao: string | null;
  valorCausa: string | null;
  movimentacoes?: DatajudMovimentacaoResponse[];
}

export interface DatajudMovimentacaoResponse {
  codigo: number | null;
  nome: string | null;
  descricao: string | null;
  data: string | null;
  dataHora: string | null;
  orgaoJulgador: string | null;
  tipo: string | null;
  chaveExterna: string | null;
}

export interface DatajudSyncResumoResponse {
  processosAvaliados: number;
  processosComNovidade: number;
  movimentacoesNovas: number;
  falhas: number;
}

export interface EventoJuridicoResponse {
  id: string;
  processoId?: string | null;
  processoNumero?: string | null;
  clienteNome?: string | null;
  fonte: string;
  tipo: string;
  status: string;
  titulo: string;
  descricao: string;
  orgaoJulgador?: string | null;
  referenciaExterna?: string | null;
  destinatario?: string | null;
  parteRelacionada?: string | null;
  dataEvento?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  criadoEm: string;
}

export interface IntegracaoDomicilioResponse {
  enabled: boolean;
  readOnly: boolean;
  prontaParaConsumo: boolean;
  baseUrl?: string | null;
  baseUrlConfigurada: boolean;
  tokenUrlConfigurada: boolean;
  clientIdConfigurado: boolean;
  clientSecretConfigurado: boolean;
  tenantIdConfigurado: boolean;
  fallbackOnBehalfOfConfigurado: boolean;
  cron?: string | null;
  operadorInstitucional?: {
    id: string;
    nome: string;
    email: string;
    cpfMascarado?: string | null;
  } | null;
  operadorInstitucionalValido: boolean;
  mensagemOperador?: string | null;
  origemOnBehalfOf?: string | null;
  onBehalfOfMascarado?: string | null;
  ultimoSync?: {
    status?: string | null;
    ultimoSyncEm?: string | null;
    ultimoSucessoEm?: string | null;
    proximoSyncEm?: string | null;
    tentativas?: number | null;
    mensagem?: string | null;
  } | null;
}

export interface TesteIntegracaoDomicilioResponse {
  sucesso: boolean;
  readOnly: boolean;
  comunicacoesEncontradas: number;
  dataInicio: string;
  dataFim: string;
  origemOnBehalfOf?: string | null;
  onBehalfOfMascarado?: string | null;
}

export interface SincronizacaoDomicilioResponse {
  eventosNovos: number;
  dataInicio: string;
  dataFim: string;
  readOnly: boolean;
}

export interface DashboardResponse {
  totalClientes: number;
  processosAtivos: number;
  prazosSemana: number;
  prazosAtrasados: number;
  prazosHoje: number;
  tarefasAbertas: number;
  proximosPrazos: Array<{
    id: string;
    titulo: string;
    data: string;
    prioridade: string;
    concluido: boolean;
  }>;
  processosRecentes: Processo[];
}

function cleanParams<T extends ApiParams | undefined>(params: T): T {
  if (!params) return params;
  const out: ApiParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      out[key] = trimmed;
      continue;
    }
    out[key] = value;
  }
  return (Object.keys(out).length ? out : undefined) as T;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get("/dashboard").then(r => r.data as DashboardResponse),
};

// ─── Processos ────────────────────────────────────────────────────────────────
export const processosApi = {
  listar: (params?: {
    unidadeId?: string;
    status?: string;
    tipo?: string;
    etiqueta?: string;
    busca?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => api.get("/processos", { params: cleanParams(params) }).then(r => r.data),

  buscar: (id: string) => api.get(`/processos/${id}`).then(r => r.data),

  consultarCapaDatajud: (numero: string) =>
    api.get(`/processos/consulta-datajud/${numero}`).then(r => r.data as DatajudCapaResponse),

  criar: (data: Record<string, unknown>) =>
    api.post("/processos", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/processos/${id}`, data).then(r => r.data),

  alterarStatus: (id: string, status: string) =>
    api.patch(`/processos/${id}/status`, { status }).then(r => r.data),

  adicionarMovimentacao: (id: string, data: Record<string, unknown>) =>
    api.post(`/processos/${id}/movimentacoes`, data).then(r => r.data),

  sincronizarDatajud: (id: string) =>
    api.post(`/processos/${id}/sincronizar-datajud`).then(r => r.data as { movimentacoesNovas: number }),

  sincronizarDatajudEmLote: () =>
    api.post("/processos/sincronizar-datajud").then(r => r.data as DatajudSyncResumoResponse),
};

// ─── Clientes ────────────────────────────────────────────────────────────────
export const clientesApi = {
  listar: (params?: {
    unidadeId?: string;
    busca?: string;
    page?: number;
    size?: number;
  }) => api.get("/clientes", { params: cleanParams(params) }).then(r => r.data),

  buscar: (id: string) => api.get(`/clientes/${id}`).then(r => r.data),

  criar: (data: Record<string, unknown>) =>
    api.post("/clientes", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/clientes/${id}`, data).then(r => r.data),

  desativar: (id: string) => api.delete(`/clientes/${id}`),
};

// ─── Prazos ──────────────────────────────────────────────────────────────────
export const prazosApi = {
  listar: (params?: {
    unidadeId?: string;
    tipo?: string;
    concluido?: boolean;
    advogadoId?: string;
    page?: number;
    size?: number;
  }) => api.get("/prazos", { params: cleanParams(params) }).then(r => r.data),

  calendario: (params: {
    inicio: string;
    fim: string;
    advogadoId?: string;
    unidadeId?: string;
  }) => api.get("/prazos/calendario", { params: cleanParams(params) }).then(r => r.data),

  criar: (data: Record<string, unknown>) =>
    api.post("/prazos", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/prazos/${id}`, data).then(r => r.data),

  atualizarEtapa: (id: string, etapa: string) =>
    api.patch(`/prazos/${id}/etapa`, { etapa }).then(r => r.data),

  concluir: (id: string) =>
    api.patch(`/prazos/${id}/concluir`).then(r => r.data),

  excluir: (id: string) => api.delete(`/prazos/${id}`),
};

// ─── Documentos ──────────────────────────────────────────────────────────────
export const documentosApi = {
  listar: (params?: {
    clienteId?: string;
    processoId?: string;
    busca?: string;
    page?: number;
    size?: number;
  }) => api.get("/documentos", { params: cleanParams(params) }).then(r => r.data),

  listarPorCliente: (clienteId: string) =>
    api.get(`/documentos/cliente/${clienteId}`).then(r => r.data),

  listarPorProcesso: (processoId: string) =>
    api.get(`/documentos/processo/${processoId}`).then(r => r.data),

  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post("/documentos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data),

  downloadUrl: (id: string) =>
    api.get(`/documentos/${id}/download`).then(r => ({ url: r.data.url as string, nome: r.data.nome as string })),

  listarClientesComDocumentos: () =>
    api.get("/documentos/clientes-com-documentos").then(r => r.data as { id: string; nome: string }[]),

  excluir: (id: string) => api.delete(`/documentos/${id}`),
};

// ─── Usuários ─────────────────────────────────────────────────────────────────
export const usuariosApi = {
  listar: () => api.get("/usuarios", { params: { size: 1000 } }).then(r => r.data),
  buscar: (id: string) => api.get(`/usuarios/${id}`).then(r => r.data),
  criar: (data: Record<string, unknown>) =>
    api.post("/usuarios", data).then(r => r.data),
  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/usuarios/${id}`, data).then(r => r.data),
  desativar: (id: string) => api.patch(`/usuarios/${id}/desativar`),
  reativar: (id: string) => api.patch(`/usuarios/${id}/reativar`),
};

// ─── Unidades ─────────────────────────────────────────────────────────────────
export const unidadesApi = {
  listar: () => api.get("/unidades", { params: { size: 1000 } }).then(r => r.data),
};

// ─── Notificações ─────────────────────────────────────────────────────────────
export const notificacoesApi = {
  listar: (params?: { page?: number; size?: number }) =>
    api.get("/notificacoes", { params: cleanParams(params) }).then(r => r.data),
  marcarLida: (id: string) =>
    api.patch(`/notificacoes/${id}/lida`).then(r => r.data),
  marcarTodasLidas: () =>
    api.patch("/notificacoes/lidas").then(r => r.data),
  contarNaoLidas: () =>
    api.get("/notificacoes/count").then(r => r.data.naoLidas as number),
};

export const eventosJuridicosApi = {
  listar: (params?: {
    status?: string;
    fonte?: string;
    processoId?: string;
    responsavelId?: string;
    page?: number;
    size?: number;
  }) => api.get("/eventos-juridicos", { params: cleanParams(params) }).then(r => r.data),

  atualizarStatus: (id: string, status: string) =>
    api.patch(`/eventos-juridicos/${id}/status`, { status }).then(r => r.data as EventoJuridicoResponse),

  vincularProcesso: (id: string, processoId: string) =>
    api.patch(`/eventos-juridicos/${id}/vincular-processo`, { processoId }).then(r => r.data as EventoJuridicoResponse),

  assumir: (id: string) =>
    api.patch(`/eventos-juridicos/${id}/assumir`).then(r => r.data as EventoJuridicoResponse),

  criarPrazo: (
    id: string,
    data: {
      titulo: string;
      data: string;
      hora?: string | null;
      tipo: string;
      prioridade: string;
      advogadoId?: string | null;
      descricao?: string | null;
    },
  ) => api.post(`/eventos-juridicos/${id}/criar-prazo`, data).then(r => r.data),

  sincronizarDomicilio: (params?: { dataInicio?: string; dataFim?: string; numeroProcesso?: string }) =>
    api.post("/eventos-juridicos/sincronizar-domicilio", null, { params: cleanParams(params) })
      .then(r => r.data as SincronizacaoDomicilioResponse),
};

export const integracoesApi = {
  buscarDomicilio: () =>
    api.get("/integracoes/domicilio").then(r => r.data as IntegracaoDomicilioResponse),

  atualizarDomicilio: (data: { usuarioOperadorId: string | null }) =>
    api.patch("/integracoes/domicilio", data).then(r => r.data as IntegracaoDomicilioResponse),

  testarDomicilio: () =>
    api.post("/integracoes/domicilio/testar").then(r => r.data as TesteIntegracaoDomicilioResponse),
};

// ─── Logs de Auditoria ────────────────────────────────────────────────────────
export const logsApi = {
  listar: (params?: { page?: number; size?: number }) =>
    api.get("/logs", { params: cleanParams(params) }).then(r => r.data),
};
