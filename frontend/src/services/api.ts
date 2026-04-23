import api from "@/lib/api";
import type { Publicacao } from "@/types/publicacoes";
import type {
  Atendimento,
  Caso,
  DashboardMetricas,
  DocumentoAtividade,
  EvolucaoProdutividade,
  IndicadorResponsavel,
  NotaPessoal,
  Prazo,
  PrazoComentario,
  PrazoDetalhe,
  ProcessoDetalhe,
  TipoPeriodoIndicadoresEquipe,
} from "@/types";

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
  linkOficial?: string | null;
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
  tenantIdOrigem?: string | null;
  cron?: string | null;
  lookbackDays?: number | null;
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
  pendencias?: string[];
  checklistAtivacao?: string[];
  ultimoSync?: {
    status?: string | null;
    ultimoSyncEm?: string | null;
    ultimoSucessoEm?: string | null;
    proximoSyncEm?: string | null;
    tentativas?: number | null;
    mensagem?: string | null;
  } | null;
}

export interface IntegracaoDatajudResponse {
  prontaParaConsumo: boolean;
  baseUrl?: string | null;
  baseUrlConfigurada: boolean;
  apiKeyConfigurada: boolean;
  cron?: string | null;
  staleHours?: number | null;
  processosMonitorados: number;
  processosSaudaveis: number;
  processosComErro: number;
  processosPendentes: number;
  ultimoSync?: {
    status?: string | null;
    ultimoSyncEm?: string | null;
    ultimoSucessoEm?: string | null;
    proximoSyncEm?: string | null;
    tentativas?: number | null;
    mensagem?: string | null;
  } | null;
  falhasRecentes: Array<{
    syncId: string;
    processoId?: string | null;
    processoNumero?: string | null;
    clienteNome?: string | null;
    status?: string | null;
    ultimoSyncEm?: string | null;
    proximoSyncEm?: string | null;
    tentativas?: number | null;
    mensagem?: string | null;
  }>;
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

export interface CriarPublicacaoDjenRequest {
  processoId: string;
  responsavelId?: string | null;
  titulo: string;
  descricao: string;
  orgaoJulgador?: string | null;
  referenciaExterna?: string | null;
  linkOficial?: string | null;
  destinatario?: string | null;
  parteRelacionada?: string | null;
  dataEvento?: string | null;
  horaEvento?: string | null;
}

export type DashboardResponse = DashboardMetricas;

export interface CalcularPrazoResponse {
  dataSugerida: string;
  quantidadeDiasUteis: number;
  contarDiaInicial: boolean;
  feriadosNacionaisConsiderados: string[];
  feriadosExtrasConsiderados: string[];
  feriadosLocaisConsiderados: string[];
  suspensoesConsideradas: string[];
  observacao: string;
}

export interface AtendimentoPayload {
  clienteId: string;
  usuarioId: string;
  unidadeId?: string | null;
  processoId?: string | null;
  tipoVinculo?: "PROCESSO" | "CASO" | "ATENDIMENTO" | null;
  vinculoReferenciaId?: string | null;
  assunto: string;
  descricao?: string | null;
  etiquetas?: string[];
}

export interface CasoPayload {
  clienteId: string;
  unidadeId?: string | null;
  responsavelId: string;
  titulo: string;
  descricao?: string | null;
  observacoes?: string | null;
  etiquetas?: string[];
  acesso: "PUBLICO" | "PRIVADO" | "EQUIPE";
  envolvidos?: Array<{
    nome: string;
    qualificacao?: string | null;
  }>;
}

export interface PrazoPayload {
  titulo: string;
  data: string;
  hora?: string | null;
  dataFim?: string | null;
  horaFim?: string | null;
  diaInteiro?: boolean;
  tipo: string;
  prioridade: string;
  etapa?: string | null;
  processoId?: string | null;
  advogadoId?: string | null;
  participantesIds?: string[];
  etiqueta?: string | null;
  descricao?: string | null;
  local?: string | null;
  modalidade?: string | null;
  sala?: string | null;
  alertaValor?: number | null;
  alertaUnidade?: string | null;
  vinculoTipo?: string | null;
  vinculoReferenciaId?: string | null;
  quadroKanban?: string | null;
  unidadeId?: string | null;
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
  get: () => api.get("/dashboard/metricas").then(r => r.data as DashboardResponse),
};

export const indicadoresEquipeApi = {
  listar: (periodo: TipoPeriodoIndicadoresEquipe) =>
    api.get("/indicadores/equipe", { params: cleanParams({ periodo }) }).then(r => r.data as IndicadorResponsavel[]),

  evolucao: (usuarioId: string, periodo: TipoPeriodoIndicadoresEquipe) =>
    api.get(`/indicadores/equipe/${usuarioId}/evolucao`, { params: cleanParams({ periodo }) }).then(r => r.data as EvolucaoProdutividade[]),
};

// ─── Processos ────────────────────────────────────────────────────────────────
export const processosApi = {
  listar: (params?: {
    unidadeId?: string;
    clienteId?: string;
    status?: string;
    tipo?: string;
    etiqueta?: string;
    busca?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => api.get("/processos", { params: cleanParams(params) }).then(r => r.data),

  buscar: (id: string) => api.get(`/processos/${id}`).then(r => r.data as ProcessoDetalhe),

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
export const atendimentosApi = {
  listar: (params?: {
    unidadeId?: string;
    clienteId?: string;
    status?: string;
    busca?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => api.get("/atendimentos", { params: cleanParams(params) }).then(r => r.data),

  buscar: (id: string) =>
    api.get(`/atendimentos/${id}`).then(r => r.data as Atendimento),

  criar: (data: AtendimentoPayload) =>
    api.post("/atendimentos", data).then(r => r.data as Atendimento),

  atualizar: (id: string, data: AtendimentoPayload) =>
    api.put(`/atendimentos/${id}`, data).then(r => r.data as Atendimento),

  excluir: (id: string) =>
    api.delete(`/atendimentos/${id}`),

  fechar: (id: string) =>
    api.patch(`/atendimentos/${id}/fechar`).then(r => r.data as Atendimento),

  reabrir: (id: string) =>
    api.patch(`/atendimentos/${id}/reabrir`).then(r => r.data as Atendimento),
};

export const casosApi = {
  listar: (params?: {
    unidadeId?: string;
    clienteId?: string;
    responsavelId?: string;
    busca?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => api.get("/casos", { params: cleanParams(params) }).then(r => r.data),

  buscar: (id: string) =>
    api.get(`/casos/${id}`).then(r => r.data as Caso),

  criar: (data: CasoPayload) =>
    api.post("/casos", data).then(r => r.data as Caso),
};

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

  buscar: (id: string) =>
    api.get(`/prazos/${id}`).then(r => r.data as Prazo),

  buscarDetalhe: (id: string) =>
    api.get(`/prazos/${id}/detalhes`).then(r => r.data as PrazoDetalhe),

  calendario: (params: {
    inicio: string;
    fim: string;
    advogadoId?: string;
    unidadeId?: string;
  }) => api.get("/prazos/calendario", { params: cleanParams(params) }).then(r => r.data),

  calcularData: (data: {
    dataInicial: string;
    quantidadeDiasUteis: number;
    contarDiaInicial?: boolean;
    feriadosExtras?: string[];
    feriadosLocais?: string[];
    suspensoes?: { dataInicio: string; dataFim: string }[];
  }) => api.post("/prazos/calcular-data", data).then(r => r.data as CalcularPrazoResponse),

  criar: (data: PrazoPayload) =>
    api.post("/prazos", data).then(r => r.data as Prazo),

  atualizar: (id: string, data: PrazoPayload) =>
    api.put(`/prazos/${id}`, data).then(r => r.data as Prazo),

  atualizarEtapa: (id: string, etapa: string) =>
    api.patch(`/prazos/${id}/etapa`, { etapa }).then(r => r.data as Prazo),

  atualizarEtapaKanban: (id: string, etapa: string) =>
    api.patch(`/prazos/${id}/etapa-kanban`, { etapa }).then(r => r.data as Prazo),

  concluir: (id: string) =>
    api.patch(`/prazos/${id}/concluir`).then(r => r.data as Prazo),

  adicionarComentario: (id: string, conteudo: string) =>
    api.post(`/prazos/${id}/comentarios`, { conteudo }).then(r => r.data as PrazoComentario),

  excluir: (id: string) => api.delete(`/prazos/${id}`),
};

export const notasPessoaisApi = {
  buscarMinhaNota: () =>
    api.get("/notas-pessoais/minha-nota").then(r => r.data as NotaPessoal),

  salvarMinhaNota: (conteudo: string) =>
    api.put("/notas-pessoais/minha-nota", { conteudo }).then(r => r.data as NotaPessoal),
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

  listarPorCliente: (clienteId: string, params?: { page?: number; size?: number }) =>
    api.get(`/documentos/cliente/${clienteId}`, { params: cleanParams(params) }).then(r => r.data),

  listarPorPasta: (pastaId: string, params?: { page?: number; size?: number }) =>
    api.get(`/documentos/pasta/${pastaId}`, { params: cleanParams(params) }).then(r => r.data),

  listarPorProcesso: (processoId: string, params?: { page?: number; size?: number }) =>
    api.get(`/documentos/processo/${processoId}`, { params: cleanParams(params) }).then(r => r.data),

  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post("/documentos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data),

  downloadUrl: (id: string) =>
    api.get(`/documentos/${id}/download`).then(r => ({ url: r.data.url as string, nome: r.data.nome as string })),

  previewUrl: (id: string) =>
    api.get(`/documentos/${id}/preview`).then(r => ({
      url: r.data.url as string,
      nome: r.data.nome as string,
      tipo: r.data.tipo as string,
    })),

  atualizar: (id: string, data: { nome?: string; categoria?: string }) =>
    api.put(`/documentos/${id}`, data).then(r => r.data),

  listarClientesComDocumentos: () =>
    api.get("/documentos/clientes-com-documentos").then(r => r.data as { id: string; nome: string }[]),

  listarAcervoClientes: () =>
    api.get("/documentos/acervo-clientes").then(r => r.data),

  listarLixeira: (params?: { page?: number; size?: number }) =>
    api.get("/documentos/lixeira", { params: cleanParams(params) }).then(r => r.data),

  atividades: (id: string) =>
    api.get(`/documentos/${id}/atividades`).then(r => r.data as DocumentoAtividade[]),

  excluir: (id: string) => api.delete(`/documentos/${id}`),

  restaurar: (id: string) => api.post(`/documentos/${id}/restaurar`).then(r => r.data),

  excluirPermanentemente: (id: string) => api.delete(`/documentos/${id}/permanente`),

  excluirStorageKey: (storageKey: string) =>
    api.delete(`/documentos/storage/${storageKey.replaceAll("/", "__")}`),
};

export const pastasApi = {
  listarInternas: () => api.get("/pastas/internas").then(r => r.data),

  criarInterna: (data: { nome: string; parentId?: string | null }) =>
    api.post("/pastas/internas", data).then(r => r.data),

  excluirInterna: (id: string) => api.delete(`/pastas/internas/${id}`),
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

  atribuirResponsavel: (id: string, responsavelId?: string | null) =>
    api.patch(`/eventos-juridicos/${id}/atribuir-responsavel`, { responsavelId: responsavelId ?? null }).then(r => r.data as EventoJuridicoResponse),

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

  registrarPublicacaoDjen: (data: CriarPublicacaoDjenRequest) =>
    api.post("/eventos-juridicos/publicacoes/djen", data).then(r => r.data as EventoJuridicoResponse),
};

export const publicacoesApi = {
  listar: (params?: { status?: string }) =>
    api.get("/publicacoes", { params: cleanParams(params) }).then(r => r.data as Publicacao[]),

  atualizarStatus: (id: string, status: string) =>
    api.put(`/publicacoes/${id}/status`, { status }).then(r => r.data as Publicacao),
};

export const integracoesApi = {
  buscarDatajud: () =>
    api.get("/integracoes/datajud").then(r => r.data as IntegracaoDatajudResponse),

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
