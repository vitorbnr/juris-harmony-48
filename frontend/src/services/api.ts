import api from "@/lib/api";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get("/dashboard").then(r => r.data),
};

// ─── Processos ────────────────────────────────────────────────────────────────
export const processosApi = {
  listar: (params?: {
    unidadeId?: string;
    status?: string;
    tipo?: string;
    busca?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => api.get("/processos", { params }).then(r => r.data),

  buscar: (id: string) => api.get(`/processos/${id}`).then(r => r.data),

  criar: (data: Record<string, unknown>) =>
    api.post("/processos", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/processos/${id}`, data).then(r => r.data),

  alterarStatus: (id: string, status: string) =>
    api.patch(`/processos/${id}/status`, { status }).then(r => r.data),

  adicionarMovimentacao: (id: string, data: Record<string, unknown>) =>
    api.post(`/processos/${id}/movimentacoes`, data).then(r => r.data),
};

// ─── Clientes ────────────────────────────────────────────────────────────────
export const clientesApi = {
  listar: (params?: {
    unidadeId?: string;
    busca?: string;
    page?: number;
    size?: number;
  }) => api.get("/clientes", { params }).then(r => r.data),

  buscar: (id: string) => api.get(`/clientes/${id}`).then(r => r.data),

  criar: (data: Record<string, unknown>) =>
    api.post("/clientes", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/clientes/${id}`, data).then(r => r.data),
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
  }) => api.get("/prazos", { params }).then(r => r.data),

  calendario: (params: {
    inicio: string;
    fim: string;
    advogadoId?: string;
    unidadeId?: string;
  }) => api.get("/prazos/calendario", { params }).then(r => r.data),

  criar: (data: Record<string, unknown>) =>
    api.post("/prazos", data).then(r => r.data),

  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/prazos/${id}`, data).then(r => r.data),

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
  }) => api.get("/documentos", { params }).then(r => r.data),

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
    api.get(`/documentos/${id}/download`).then(r => r.data.url as string),

  excluir: (id: string) => api.delete(`/documentos/${id}`),
};

// ─── Usuários ─────────────────────────────────────────────────────────────────
export const usuariosApi = {
  listar: () => api.get("/usuarios").then(r => r.data),
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
  listar: () => api.get("/unidades").then(r => r.data),
};

// ─── Notificações ─────────────────────────────────────────────────────────────
export const notificacoesApi = {
  listar: (params?: { page?: number; size?: number }) =>
    api.get("/notificacoes", { params }).then(r => r.data),
  marcarLida: (id: string) =>
    api.patch(`/notificacoes/${id}/lida`).then(r => r.data),
  contarNaoLidas: () =>
    api.get("/notificacoes/count").then(r => r.data.naoLidas as number),
};

// ─── Logs de Auditoria ────────────────────────────────────────────────────────
export const logsApi = {
  listar: (params?: { page?: number; size?: number }) =>
    api.get("/logs", { params }).then(r => r.data),
};
