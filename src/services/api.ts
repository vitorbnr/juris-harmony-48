import api from "@/lib/api";

// ── Clientes ──────────────────────────────────────────────────────────────

export interface ClienteAPI {
  id: string;
  nome: string;
  tipo: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  dataCadastro: string;
  advogadoNome: string;
  unidadeId: string;
  unidadeNome: string;
  ativo: boolean;
}

export const clientesApi = {
  listar: (params?: { busca?: string; unidadeId?: string; page?: number; size?: number }) =>
    api.get("/clientes", { params }).then(r => r.data),
  buscar: (id: string) => api.get(`/clientes/${id}`).then(r => r.data),
  criar: (data: Record<string, unknown>) => api.post("/clientes", data).then(r => r.data),
  atualizar: (id: string, data: Record<string, unknown>) => api.put(`/clientes/${id}`, data).then(r => r.data),
};

// ── Processos ─────────────────────────────────────────────────────────────

export const processosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get("/processos", { params }).then(r => r.data),
  buscar: (id: string) => api.get(`/processos/${id}`).then(r => r.data),
  criar: (data: Record<string, unknown>) => api.post("/processos", data).then(r => r.data),
  atualizar: (id: string, data: Record<string, unknown>) => api.patch(`/processos/${id}`, data).then(r => r.data),
  adicionarMovimentacao: (id: string, data: Record<string, unknown>) =>
    api.post(`/processos/${id}/movimentacoes`, data).then(r => r.data),
};

// ── Prazos ────────────────────────────────────────────────────────────────

export const prazosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get("/prazos", { params }).then(r => r.data),
  calendario: (inicio: string, fim: string) =>
    api.get("/prazos/calendario", { params: { inicio, fim } }).then(r => r.data),
  criar: (data: Record<string, unknown>) => api.post("/prazos", data).then(r => r.data),
  concluir: (id: string) => api.patch(`/prazos/${id}/concluir`).then(r => r.data),
};

// ── Documentos ────────────────────────────────────────────────────────────

export const documentosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get("/documentos", { params }).then(r => r.data),
  upload: (file: File, metadata: Record<string, string>) => {
    const formData = new FormData();
    formData.append("arquivo", file);
    Object.entries(metadata).forEach(([k, v]) => formData.append(k, v));
    return api.post("/documentos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
  download: (id: string) => api.get(`/documentos/${id}/download`).then(r => r.data),
  excluir: (id: string) => api.delete(`/documentos/${id}`).then(r => r.data),
};

// ── Notificações ──────────────────────────────────────────────────────────

export const notificacoesApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get("/notificacoes", { params }).then(r => r.data),
  contarNaoLidas: () => api.get("/notificacoes/count").then(r => r.data),
  marcarLida: (id: string) => api.patch(`/notificacoes/${id}/lida`).then(r => r.data),
};

// ── Dashboard ────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get("/dashboard").then(r => r.data),
};

// ── Unidades ──────────────────────────────────────────────────────────────

export const unidadesApi = {
  listar: () => api.get("/unidades").then(r => r.data),
};

// ── Usuários ──────────────────────────────────────────────────────────────

export const usuariosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get("/usuarios", { params }).then(r => r.data),
  criar: (data: Record<string, unknown>) => api.post("/usuarios", data).then(r => r.data),
  atualizar: (id: string, data: Record<string, unknown>) => api.put(`/usuarios/${id}`, data).then(r => r.data),
  desativar: (id: string) => api.patch(`/usuarios/${id}/desativar`).then(r => r.data),
};
