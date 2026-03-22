import type {
  Usuario, Cliente, Processo, Prazo, Documento, Pasta, LogAuditoria
} from "@/types";

// ─── Usuários ────────────────────────────────────────────────────────────────

export const usuarios: Usuario[] = [
  {
    id: "u1", nome: "Dr. Rafael Viana", email: "rafael@vianaadv.com.br",
    cargo: "Sócio-Administrador", oab: "SP 123.456", papel: "administrador",
    ativo: true, initials: "RV",
  },
  {
    id: "u2", nome: "Dra. Camila Ferreira", email: "camila@vianaadv.com.br",
    cargo: "Advogada", oab: "SP 234.567", papel: "advogado",
    ativo: true, initials: "CF",
  },
  {
    id: "u3", nome: "Dr. Gustavo Mendes", email: "gustavo@vianaadv.com.br",
    cargo: "Advogado", oab: "SP 345.678", papel: "advogado",
    ativo: true, initials: "GM",
  },
  {
    id: "u4", nome: "Patrícia Alves", email: "patricia@vianaadv.com.br",
    cargo: "Secretária", papel: "secretaria",
    ativo: true, initials: "PA",
  },
  {
    id: "u5", nome: "Fernanda Costa", email: "fernanda@vianaadv.com.br",
    cargo: "Secretária", papel: "secretaria",
    ativo: false, initials: "FC",
  },
];

export const usuarioAtual = usuarios[0]; // Dr. Rafael Viana (admin)

// ─── Clientes ────────────────────────────────────────────────────────────────

export const clientes: Cliente[] = [
  {
    id: "c1", nome: "Maria Oliveira", tipo: "pessoa_fisica", cpfCnpj: "123.456.789-00",
    email: "maria.oliveira@email.com", telefone: "(11) 98765-4321",
    cidade: "São Paulo", estado: "SP", dataCadastro: "2023-03-15",
    processos: 2, advogadoResponsavel: "Dra. Camila Ferreira", initials: "MO",
  },
  {
    id: "c2", nome: "João Santos", tipo: "pessoa_fisica", cpfCnpj: "234.567.890-11",
    email: "joao.santos@email.com", telefone: "(11) 97654-3210",
    cidade: "Guarulhos", estado: "SP", dataCadastro: "2023-06-22",
    processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes", initials: "JS",
  },
  {
    id: "c3", nome: "Ana Costa", tipo: "pessoa_fisica", cpfCnpj: "345.678.901-22",
    email: "ana.costa@email.com", telefone: "(11) 96543-2109",
    cidade: "Santo André", estado: "SP", dataCadastro: "2023-08-10",
    processos: 3, advogadoResponsavel: "Dr. Rafael Viana", initials: "AC",
  },
  {
    id: "c4", nome: "Pedro Lima", tipo: "pessoa_fisica", cpfCnpj: "456.789.012-33",
    email: "pedro.lima@email.com", telefone: "(11) 95432-1098",
    cidade: "São Bernardo", estado: "SP", dataCadastro: "2023-11-05",
    processos: 1, advogadoResponsavel: "Dra. Camila Ferreira", initials: "PL",
  },
  {
    id: "c5", nome: "Carla Souza", tipo: "pessoa_fisica", cpfCnpj: "567.890.123-44",
    email: "carla.souza@email.com", telefone: "(11) 94321-0987",
    cidade: "São Paulo", estado: "SP", dataCadastro: "2024-01-18",
    processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes", initials: "CS",
  },
  {
    id: "c6", nome: "Construtora Alfa Ltda.", tipo: "pessoa_juridica", cpfCnpj: "12.345.678/0001-90",
    email: "juridico@construtoraalfa.com.br", telefone: "(11) 3333-1111",
    cidade: "São Paulo", estado: "SP", dataCadastro: "2022-07-30",
    processos: 5, advogadoResponsavel: "Dr. Rafael Viana", initials: "CA",
  },
  {
    id: "c7", nome: "Farmácia Bem Estar ME", tipo: "pessoa_juridica", cpfCnpj: "98.765.432/0001-10",
    email: "contato@farmaciabem.com.br", telefone: "(11) 2222-9876",
    cidade: "Osasco", estado: "SP", dataCadastro: "2024-02-14",
    processos: 2, advogadoResponsavel: "Dra. Camila Ferreira", initials: "FB",
  },
  {
    id: "c8", nome: "Roberto Figueiredo", tipo: "pessoa_fisica", cpfCnpj: "678.901.234-55",
    email: "roberto.fig@email.com", telefone: "(11) 93210-9876",
    cidade: "São Paulo", estado: "SP", dataCadastro: "2024-03-01",
    processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes", initials: "RF",
  },
];

// ─── Processos ───────────────────────────────────────────────────────────────

export const processos: Processo[] = [
  {
    id: "p1", numero: "0012345-67.2024.8.26.0100",
    clienteId: "c1", clienteNome: "Maria Oliveira",
    tipo: "Trabalhista", vara: "1ª Vara do Trabalho de São Paulo",
    tribunal: "TRT-2", advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira",
    status: "Em andamento", dataDistribuicao: "2024-03-15",
    ultimaMovimentacao: "2026-03-18", proximoPrazo: "2026-03-22",
    valorCausa: "R$ 45.000,00",
    descricao: "Reclamação trabalhista por horas extras não pagas e verbas rescisórias.",
    movimentacoes: [
      { id: "m1", data: "2026-03-18", descricao: "Publicação de despacho: prazo para contestação", tipo: "publicacao" },
      { id: "m2", data: "2026-02-10", descricao: "Audiência de instrução realizada", tipo: "audiencia" },
      { id: "m3", data: "2026-01-05", descricao: "Petição inicial protocolada", tipo: "peticao" },
    ],
  },
  {
    id: "p2", numero: "0098765-43.2024.8.26.0068",
    clienteId: "c2", clienteNome: "João Santos",
    tipo: "Cível", vara: "3ª Vara Cível de Guarulhos",
    tribunal: "TJSP", advogadoId: "u3", advogadoNome: "Dr. Gustavo Mendes",
    status: "Aguardando", dataDistribuicao: "2024-06-22",
    ultimaMovimentacao: "2026-03-10", proximoPrazo: "2026-03-25",
    valorCausa: "R$ 28.500,00",
    descricao: "Ação de indenização por danos morais e materiais decorrentes de acidente de veículo.",
    movimentacoes: [
      { id: "m4", data: "2026-03-10", descricao: "Aguardando designação de audiência", tipo: "despacho" },
      { id: "m5", data: "2025-12-20", descricao: "Réplica à contestação protocolada", tipo: "peticao" },
    ],
  },
  {
    id: "p3", numero: "0054321-89.2024.8.26.0050",
    clienteId: "c3", clienteNome: "Ana Costa",
    tipo: "Família", vara: "2ª Vara de Família e Sucessões",
    tribunal: "TJSP", advogadoId: "u1", advogadoNome: "Dr. Rafael Viana",
    status: "Concluído", dataDistribuicao: "2024-08-10",
    ultimaMovimentacao: "2026-03-01", valorCausa: "R$ 0,00",
    descricao: "Divórcio consensual com partilha de bens.",
    movimentacoes: [
      { id: "m6", data: "2026-03-01", descricao: "Sentença homologatória publicada — trânsito em julgado", tipo: "sentenca" },
    ],
  },
  {
    id: "p4", numero: "0011223-44.2024.8.26.0100",
    clienteId: "c4", clienteNome: "Pedro Lima",
    tipo: "Tributário", vara: "1ª Vara de Fazenda Pública",
    tribunal: "TJSP", advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira",
    status: "Em andamento", dataDistribuicao: "2024-11-05",
    ultimaMovimentacao: "2026-03-19", proximoPrazo: "2026-04-05",
    valorCausa: "R$ 120.000,00",
    descricao: "Mandado de segurança contra cobrança indevida de ICMS.",
    movimentacoes: [
      { id: "m7", data: "2026-03-19", descricao: "Liminar deferida — CNDT suspensa", tipo: "despacho" },
    ],
  },
  {
    id: "p5", numero: "0077889-55.2024.8.26.0050",
    clienteId: "c5", clienteNome: "Carla Souza",
    tipo: "Criminal", vara: "5ª Vara Criminal",
    tribunal: "TJSP", advogadoId: "u3", advogadoNome: "Dr. Gustavo Mendes",
    status: "Urgente", dataDistribuicao: "2025-01-20",
    ultimaMovimentacao: "2026-03-21", proximoPrazo: "2026-03-24",
    valorCausa: "—",
    descricao: "Defesa em ação penal por estelionato.",
    movimentacoes: [
      { id: "m8", data: "2026-03-21", descricao: "Prazo para apresentação de defesa prévia vence em 3 dias", tipo: "publicacao" },
    ],
  },
  {
    id: "p6", numero: "0033445-12.2023.8.26.0100",
    clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",
    tipo: "Empresarial", vara: "1ª Vara Empresarial",
    tribunal: "TJSP", advogadoId: "u1", advogadoNome: "Dr. Rafael Viana",
    status: "Em andamento", dataDistribuicao: "2023-07-30",
    ultimaMovimentacao: "2026-03-15", proximoPrazo: "2026-04-10",
    valorCausa: "R$ 850.000,00",
    descricao: "Ação de cobrança por contrato de empreitada não cumprido.",
  },
  {
    id: "p7", numero: "0019283-77.2024.8.26.0100",
    clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",
    tipo: "Trabalhista", vara: "3ª Vara do Trabalho",
    tribunal: "TRT-2", advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira",
    status: "Suspenso", dataDistribuicao: "2024-09-15",
    ultimaMovimentacao: "2026-02-20",
    valorCausa: "R$ 32.000,00",
    descricao: "Reclamação trabalhista por acidente de trabalho.",
  },
  {
    id: "p8", numero: "0047382-90.2024.8.26.0001",
    clienteId: "c7", clienteNome: "Farmácia Bem Estar ME",
    tipo: "Administrativo", vara: "2ª Vara da Fazenda Pública",
    tribunal: "TJSP", advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira",
    status: "Em andamento", dataDistribuicao: "2024-02-14",
    ultimaMovimentacao: "2026-03-20", proximoPrazo: "2026-03-28",
    valorCausa: "R$ 65.000,00",
    descricao: "Impugnação de auto de infração da Vigilância Sanitária.",
  },
];

// ─── Prazos ───────────────────────────────────────────────────────────────────

export const prazos: Prazo[] = [
  {
    id: "pr1", titulo: "Contestação — Maria Oliveira",
    processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", clienteNome: "Maria Oliveira",
    data: "2026-03-22", hora: "23:59", tipo: "prazo_processual", prioridade: "alta",
    concluido: false, advogadoId: "u2",
  },
  {
    id: "pr2", titulo: "Defesa Prévia — Carla Souza",
    processoId: "p5", processoNumero: "0077889-55.2024.8.26.0050", clienteNome: "Carla Souza",
    data: "2026-03-24", hora: "23:59", tipo: "prazo_processual", prioridade: "alta",
    concluido: false, advogadoId: "u3",
  },
  {
    id: "pr3", titulo: "Audiência de Conciliação — João Santos",
    processoId: "p2", processoNumero: "0098765-43.2024.8.26.0068", clienteNome: "João Santos",
    data: "2026-03-25", hora: "14:00", tipo: "audiencia", prioridade: "alta",
    concluido: false, advogadoId: "u3",
  },
  {
    id: "pr4", titulo: "Reunião com Construtora Alfa",
    clienteNome: "Construtora Alfa Ltda.",
    data: "2026-03-26", hora: "10:00", tipo: "reuniao", prioridade: "media",
    concluido: false, advogadoId: "u1",
    descricao: "Alinhamento sobre estratégia do processo empresarial",
  },
  {
    id: "pr5", titulo: "Manifestação — Farmácia Bem Estar",
    processoId: "p8", processoNumero: "0047382-90.2024.8.26.0001", clienteNome: "Farmácia Bem Estar ME",
    data: "2026-03-28", hora: "23:59", tipo: "prazo_processual", prioridade: "alta",
    concluido: false, advogadoId: "u2",
  },
  {
    id: "pr6", titulo: "Petição de Recurso — Pedro Lima",
    processoId: "p4", processoNumero: "0011223-44.2024.8.26.0100", clienteNome: "Pedro Lima",
    data: "2026-04-05", hora: "23:59", tipo: "prazo_processual", prioridade: "media",
    concluido: false, advogadoId: "u2",
  },
  {
    id: "pr7", titulo: "Audiência UNO — Construtora Alfa",
    processoId: "p6", clienteNome: "Construtora Alfa Ltda.",
    data: "2026-04-10", hora: "09:30", tipo: "audiencia", prioridade: "alta",
    concluido: false, advogadoId: "u1",
  },
  {
    id: "pr8", titulo: "Atualizar dados cadastrais — clientes 2023",
    data: "2026-04-15", tipo: "tarefa_interna", prioridade: "baixa",
    concluido: false,
    descricao: "Verificar e atualizar contatos e documentos dos clientes cadastrados em 2023",
  },
  {
    id: "pr9", titulo: "Contestação — Ana Costa (processo família)",
    processoId: "p3", clienteNome: "Ana Costa",
    data: "2026-03-19", tipo: "prazo_processual", prioridade: "alta",
    concluido: true, advogadoId: "u1",
  },
  {
    id: "pr10", titulo: "Reunião interna — revisão de casos",
    data: "2026-03-21", hora: "18:00", tipo: "reuniao", prioridade: "media",
    concluido: true,
  },
];

// ─── Documentos ───────────────────────────────────────────────────────────────

export const pastas: Pasta[] = [
  { id: "pasta_todos", nome: "Todos os Documentos", documentos: 24 },
  { id: "pasta_c1", nome: "Maria Oliveira", clienteId: "c1", documentos: 5 },
  { id: "pasta_c1_p1", nome: "Proc. 0012345-67 (Trabalhista)", clienteId: "c1", processoId: "p1", parentId: "pasta_c1", documentos: 4 },
  { id: "pasta_c2", nome: "João Santos", clienteId: "c2", documentos: 3 },
  { id: "pasta_c2_p2", nome: "Proc. 0098765-43 (Cível)", clienteId: "c2", processoId: "p2", parentId: "pasta_c2", documentos: 3 },
  { id: "pasta_c3", nome: "Ana Costa", clienteId: "c3", documentos: 4 },
  { id: "pasta_c4", nome: "Pedro Lima", clienteId: "c4", documentos: 2 },
  { id: "pasta_c5", nome: "Carla Souza", clienteId: "c5", documentos: 3 },
  { id: "pasta_c6", nome: "Construtora Alfa Ltda.", clienteId: "c6", documentos: 5 },
  { id: "pasta_c7", nome: "Farmácia Bem Estar ME", clienteId: "c7", documentos: 2 },
];

export const documentos: Documento[] = [
  { id: "d1", nome: "Petição Inicial.pdf", tipo: "pdf", categoria: "peticao", tamanho: "284 KB", clienteId: "c1", clienteNome: "Maria Oliveira", processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", pastaId: "pasta_c1_p1", dataUpload: "2024-03-15", uploadadoPor: "Dra. Camila Ferreira" },
  { id: "d2", nome: "Procuração AD JUDICIA.docx", tipo: "docx", categoria: "procuracao", tamanho: "45 KB", clienteId: "c1", clienteNome: "Maria Oliveira", processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", pastaId: "pasta_c1_p1", dataUpload: "2024-03-15", uploadadoPor: "Patrícia Alves" },
  { id: "d3", nome: "Contestação.docx", tipo: "docx", categoria: "peticao", tamanho: "132 KB", clienteId: "c1", clienteNome: "Maria Oliveira", processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", pastaId: "pasta_c1_p1", dataUpload: "2025-05-10", uploadadoPor: "Dra. Camila Ferreira" },
  { id: "d4", nome: "CTPS - Cópia.pdf", tipo: "pdf", categoria: "comprovante", tamanho: "1.2 MB", clienteId: "c1", clienteNome: "Maria Oliveira", processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", pastaId: "pasta_c1_p1", dataUpload: "2024-03-14", uploadadoPor: "Patrícia Alves" },
  { id: "d5", nome: "Contrato de Honorários.pdf", tipo: "pdf", categoria: "contrato", tamanho: "98 KB", clienteId: "c1", clienteNome: "Maria Oliveira", pastaId: "pasta_c1", dataUpload: "2024-03-10", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d6", nome: "Petição Inicial - Indenização.pdf", tipo: "pdf", categoria: "peticao", tamanho: "310 KB", clienteId: "c2", clienteNome: "João Santos", processoId: "p2", processoNumero: "0098765-43.2024.8.26.0068", pastaId: "pasta_c2_p2", dataUpload: "2024-06-22", uploadadoPor: "Dr. Gustavo Mendes" },
  { id: "d7", nome: "Boletim de Ocorrência.pdf", tipo: "pdf", categoria: "comprovante", tamanho: "540 KB", clienteId: "c2", clienteNome: "João Santos", processoId: "p2", processoNumero: "0098765-43.2024.8.26.0068", pastaId: "pasta_c2_p2", dataUpload: "2024-06-20", uploadadoPor: "Patrícia Alves" },
  { id: "d8", nome: "Fotos do Acidente.jpg", tipo: "jpg", categoria: "comprovante", tamanho: "4.8 MB", clienteId: "c2", clienteNome: "João Santos", processoId: "p2", processoNumero: "0098765-43.2024.8.26.0068", pastaId: "pasta_c2_p2", dataUpload: "2024-06-20", uploadadoPor: "Patrícia Alves" },
  { id: "d9", nome: "Sentença Homologatória.pdf", tipo: "pdf", categoria: "sentenca", tamanho: "220 KB", clienteId: "c3", clienteNome: "Ana Costa", processoId: "p3", pastaId: "pasta_c3", dataUpload: "2026-03-01", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d10", nome: "Planilha de Bens.xlsx", tipo: "xlsx", categoria: "outros", tamanho: "88 KB", clienteId: "c3", clienteNome: "Ana Costa", pastaId: "pasta_c3", dataUpload: "2024-09-05", uploadadoPor: "Patrícia Alves" },
  { id: "d11", nome: "Mandado de Segurança.pdf", tipo: "pdf", categoria: "peticao", tamanho: "175 KB", clienteId: "c4", clienteNome: "Pedro Lima", processoId: "p4", pastaId: "pasta_c4", dataUpload: "2024-11-05", uploadadoPor: "Dra. Camila Ferreira" },
  { id: "d12", nome: "Defesa Prévia.docx", tipo: "docx", categoria: "peticao", tamanho: "95 KB", clienteId: "c5", clienteNome: "Carla Souza", processoId: "p5", pastaId: "pasta_c5", dataUpload: "2026-03-20", uploadadoPor: "Dr. Gustavo Mendes" },
  { id: "d13", nome: "Contrato de Empreitada.pdf", tipo: "pdf", categoria: "contrato", tamanho: "620 KB", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.", processoId: "p6", pastaId: "pasta_c6", dataUpload: "2023-07-30", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d14", nome: "Laudo Pericial.pdf", tipo: "pdf", categoria: "comprovante", tamanho: "1.8 MB", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.", processoId: "p6", pastaId: "pasta_c6", dataUpload: "2025-03-15", uploadadoPor: "Dr. Rafael Viana" },
];

// ─── Logs de Auditoria ───────────────────────────────────────────────────────

export const logsAuditoria: LogAuditoria[] = [
  { id: "l1", usuarioNome: "Dr. Rafael Viana", usuarioPapel: "administrador", acao: "criou", modulo: "processos", descricao: "Criou processo nº 0033445-12.2023.8.26.0100 para Construtora Alfa Ltda.", data: "2026-03-21", hora: "09:12", ip: "192.168.1.10" },
  { id: "l2", usuarioNome: "Dra. Camila Ferreira", usuarioPapel: "advogado", acao: "fez_upload", modulo: "documentos", descricao: "Upload de 'Defesa Prévia.docx' no processo de Carla Souza", data: "2026-03-20", hora: "16:45", ip: "192.168.1.11" },
  { id: "l3", usuarioNome: "Patrícia Alves", usuarioPapel: "secretaria", acao: "visualizou", modulo: "documentos", descricao: "Visualizou documentos do cliente João Santos", data: "2026-03-20", hora: "14:20", ip: "192.168.1.14" },
  { id: "l4", usuarioNome: "Dr. Gustavo Mendes", usuarioPapel: "advogado", acao: "editou", modulo: "clientes", descricao: "Atualizou telefone de contato de Carla Souza", data: "2026-03-19", hora: "11:05", ip: "192.168.1.12" },
  { id: "l5", usuarioNome: "Dr. Rafael Viana", usuarioPapel: "administrador", acao: "criou", modulo: "usuarios", descricao: "Criou usuário Fernanda Costa (Secretária)", data: "2026-03-18", hora: "08:30", ip: "192.168.1.10" },
  { id: "l6", usuarioNome: "Dra. Camila Ferreira", usuarioPapel: "advogado", acao: "acessou", modulo: "processos", descricao: "Acessou processo de Maria Oliveira (Trabalhista)", data: "2026-03-18", hora: "10:15", ip: "192.168.1.11" },
  { id: "l7", usuarioNome: "Patrícia Alves", usuarioPapel: "secretaria", acao: "criou", modulo: "prazos", descricao: "Agendou reunião: 'Reunião com Construtora Alfa' para 26/03/2026", data: "2026-03-17", hora: "13:40", ip: "192.168.1.14" },
  { id: "l8", usuarioNome: "Dr. Rafael Viana", usuarioPapel: "administrador", acao: "baixou", modulo: "documentos", descricao: "Download de 'Sentença Homologatória.pdf' do processo de Ana Costa", data: "2026-03-17", hora: "17:55", ip: "192.168.1.10" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

export const getClienteById = (id: string) => clientes.find(c => c.id === id);
export const getProcessoById = (id: string) => processos.find(p => p.id === id);
export const getProcessosByCliente = (clienteId: string) => processos.filter(p => p.clienteId === clienteId);
export const getPrazosByData = (data: string) => prazos.filter(p => p.data === data);
export const getDocumentosByPasta = (pastaId: string) => documentos.filter(d => d.pastaId === pastaId);
