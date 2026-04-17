import type { Usuario, Cliente, Processo, Prazo, Documento, Pasta, LogAuditoria, Unidade, Honorario, CustaProcessual, LancamentoFinanceiro, Notificacao } from "@/types";

// ─── Unidades ────────────────────────────────────────────────────────────────

export const unidades: Unidade[] = [
  { id: "u_car", nome: "Carinhanha", cidade: "Carinhanha", estado: "BA" },
  { id: "u_coc", nome: "Cocos",      cidade: "Cocos",      estado: "BA" },
];

export const unidadeAtual = unidades[0];

// ─── Usuários ────────────────────────────────────────────────────────────────

export const usuarios: Usuario[] = [
  { id: "u1", nome: "Dr. Rafael Viana",   initials: "RV", email: "rafael@vianaadv.com.br",  cargo: "Advogado Sênior", oab: "SP 123.456", papel: "administrador", ativo: true,  unidadeId: "u_car" },
  { id: "u2", nome: "Dra. Camila Ferreira",initials: "CF", email: "camila@vianaadv.com.br", cargo: "Advogada", oab: "SP 234.567", papel: "advogado",      ativo: true,  unidadeId: "u_car" },
  { id: "u3", nome: "Dr. Gustavo Mendes", initials: "GM", email: "gustavo@vianaadv.com.br", cargo: "Advogado", oab: "SP 345.678", papel: "advogado",      ativo: true,  unidadeId: "u_coc" },
  { id: "u4", nome: "Patrícia Alves",     initials: "PA", email: "patricia@vianaadv.com.br",cargo: "Secretária", papel: "secretaria",    ativo: true,  unidadeId: "u_car" },
  { id: "u5", nome: "Fernanda Costa",     initials: "FC", email: "fernanda@vianaadv.com.br", cargo: "Secretária", papel: "secretaria",   ativo: false, unidadeId: "u_coc" },
];

export const usuarioAtual = { ...usuarios[0] };

// ─── Clientes ────────────────────────────────────────────────────────────────

export const clientes: Cliente[] = [
  { id: "c1", nome: "Maria Oliveira",       initials: "MO", tipo: "pessoa_fisica",   cpfCnpj: "123.456.789-00", email: "maria.oliveira@email.com",      telefone: "(11) 98765-4321", cidade: "Carinhanha",  estado: "BA", dataCadastro: "2022-03-15", processos: 2, advogadoResponsavel: "Dra. Camila Ferreira", unidadeId: "u_car" },
  { id: "c2", nome: "João Santos",          initials: "JS", tipo: "pessoa_fisica",   cpfCnpj: "234.567.890-11", email: "joao.santos@email.com",         telefone: "(11) 97654-3210", cidade: "Carinhanha",  estado: "BA", dataCadastro: "2021-08-22", processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes",  unidadeId: "u_car" },
  { id: "c3", nome: "Ana Costa",            initials: "AC", tipo: "pessoa_fisica",   cpfCnpj: "345.678.901-22", email: "ana.costa@email.com",           telefone: "(11) 96543-2109", cidade: "Cocos",       estado: "BA", dataCadastro: "2023-01-10", processos: 3, advogadoResponsavel: "Dr. Rafael Viana",    unidadeId: "u_coc" },
  { id: "c4", nome: "Pedro Lima",           initials: "PL", tipo: "pessoa_fisica",   cpfCnpj: "456.789.012-33", email: "pedro.lima@email.com",          telefone: "(11) 95432-1098", cidade: "Cocos",       estado: "BA", dataCadastro: "2022-11-05", processos: 1, advogadoResponsavel: "Dra. Camila Ferreira", unidadeId: "u_coc" },
  { id: "c5", nome: "Carla Souza",          initials: "CS", tipo: "pessoa_fisica",   cpfCnpj: "567.890.123-44", email: "carla.souza@email.com",         telefone: "(11) 94321-0987", cidade: "Carinhanha",  estado: "BA", dataCadastro: "2020-06-18", processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes",  unidadeId: "u_car" },
  { id: "c6", nome: "Construtora Alfa Ltda.",initials: "CA",tipo: "pessoa_juridica", cpfCnpj: "12.345.678/0001-90",email: "juridico@construtoraalfa.com.br",telefone: "(11) 3333-1111",cidade: "Carinhanha", estado: "BA", dataCadastro: "2019-04-10", processos: 5, advogadoResponsavel: "Dr. Rafael Viana",    unidadeId: "u_car" },
  { id: "c7", nome: "Farmácia Bem Estar ME",initials: "FB", tipo: "pessoa_juridica", cpfCnpj: "98.765.432/0001-10",email: "contato@farmaciabem.com.br",   telefone: "(11) 2222-9876",cidade: "Cocos",      estado: "BA", dataCadastro: "2021-09-30", processos: 2, advogadoResponsavel: "Dra. Camila Ferreira", unidadeId: "u_coc" },
  { id: "c8", nome: "Roberto Figueiredo",   initials: "RF", tipo: "pessoa_fisica",   cpfCnpj: "678.901.234-55", email: "roberto.fig@email.com",         telefone: "(11) 93210-9876", cidade: "Cocos",       estado: "BA", dataCadastro: "2023-07-14", processos: 1, advogadoResponsavel: "Dr. Gustavo Mendes",  unidadeId: "u_coc" },
];

// ─── Processos ───────────────────────────────────────────────────────────────

export const processos: Processo[] = [
  {
    id: "p1", numero: "0012345-67.2024.8.26.0100", clienteId: "c1", clienteNome: "Maria Oliveira",
    tipo: "Trabalhista", vara: "2ª Vara do Trabalho", tribunal: "TRT-5",
    advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira", status: "Urgente",
    dataDistribuicao: "2024-01-15", ultimaMovimentacao: "2024-11-10", proximoPrazo: "2024-03-22",
    valorCausa: "R$ 45.000,00", unidadeId: "u_car",
    descricao: "Reclamação trabalhista por verbas rescisórias não pagas.",
    movimentacoes: [
      { id: "m1", data: "2024-01-15", descricao: "Petição inicial distribuída", tipo: "peticao" },
      { id: "m2", data: "2024-02-20", descricao: "Despacho: citação do réu determinada", tipo: "despacho" },
      { id: "m3", data: "2024-03-10", descricao: "Audiência de instrução designada para 22/03", tipo: "audiencia" },
    ],
  },
  {
    id: "p2", numero: "0098765-43.2024.8.26.0200", clienteId: "c2", clienteNome: "João Santos",
    tipo: "Cível", vara: "3ª Vara Cível", tribunal: "TJBA",
    advogadoId: "u3", advogadoNome: "Dr. Gustavo Mendes", status: "Em andamento",
    dataDistribuicao: "2024-03-08", ultimaMovimentacao: "2024-11-05", proximoPrazo: "2024-03-25",
    valorCausa: "R$ 32.000,00", unidadeId: "u_car",
    movimentacoes: [
      { id: "m4", data: "2024-03-08", descricao: "Distribuição da ação", tipo: "peticao" },
      { id: "m5", data: "2024-04-12", descricao: "Contestação apresentada pela parte adversa", tipo: "despacho" },
    ],
  },
  {
    id: "p3", numero: "0055432-12.2023.8.26.0300", clienteId: "c3", clienteNome: "Ana Costa",
    tipo: "Família", vara: "1ª Vara de Família", tribunal: "TJBA",
    advogadoId: "u1", advogadoNome: "Dr. Rafael Viana", status: "Em andamento",
    dataDistribuicao: "2023-09-22", ultimaMovimentacao: "2024-10-28", proximoPrazo: "2024-04-10",
    valorCausa: "R$ 28.500,00", unidadeId: "u_coc",
    movimentacoes: [
      { id: "m6", data: "2023-09-22", descricao: "Petição inicial de divórcio litigioso", tipo: "peticao" },
      { id: "m7", data: "2024-01-15", descricao: "Audiência de mediação realizada sem acordo", tipo: "audiencia" },
    ],
  },
  {
    id: "p4", numero: "0011223-44.2023.8.26.0400", clienteId: "c4", clienteNome: "Pedro Lima",
    tipo: "Previdenciário", vara: "Juizado Especial Federal", tribunal: "TRF-1",
    advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira", status: "Aguardando",
    dataDistribuicao: "2023-06-14", ultimaMovimentacao: "2024-10-15", proximoPrazo: "2024-04-05",
    valorCausa: "R$ 15.000,00", unidadeId: "u_coc",
    movimentacoes: [
      { id: "m8", data: "2023-06-14", descricao: "Pedido de aposentadoria por invalidez protocolado", tipo: "peticao" },
      { id: "m9", data: "2024-02-01", descricao: "Perícia médica agendada pelo INSS", tipo: "despacho" },
    ],
  },
  {
    id: "p5", numero: "0033456-78.2022.8.26.0500", clienteId: "c5", clienteNome: "Carla Souza",
    tipo: "Cível", vara: "4ª Vara Cível", tribunal: "TJBA",
    advogadoId: "u3", advogadoNome: "Dr. Gustavo Mendes", status: "Concluído",
    dataDistribuicao: "2022-04-03", ultimaMovimentacao: "2024-09-20",
    valorCausa: "R$ 8.200,00", unidadeId: "u_car",
    movimentacoes: [
      { id: "m10", data: "2022-04-03", descricao: "Ação de cobrança distribuída", tipo: "peticao" },
      { id: "m11", data: "2023-11-10", descricao: "Sentença procedente — pagamento em 15 dias", tipo: "sentenca" },
    ],
  },
  {
    id: "p6", numero: "0077889-55.2024.8.26.0600", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",
    tipo: "Empresarial", vara: "2ª Vara Empresarial", tribunal: "TJBA",
    advogadoId: "u1", advogadoNome: "Dr. Rafael Viana", status: "Urgente",
    dataDistribuicao: "2024-02-14", ultimaMovimentacao: "2024-11-08", proximoPrazo: "2024-03-24",
    valorCausa: "R$ 180.000,00", unidadeId: "u_car",
    movimentacoes: [
      { id: "m12", data: "2024-02-14", descricao: "Ação de dissolução de contrato distribuída", tipo: "peticao" },
      { id: "m13", data: "2024-03-18", descricao: "Tutela antecipada deferida", tipo: "despacho" },
    ],
  },
  {
    id: "p7", numero: "0047382-90.2023.8.26.0700", clienteId: "c7", clienteNome: "Farmácia Bem Estar ME",
    tipo: "Tributário", vara: "Vara de Fazenda Pública", tribunal: "TJBA",
    advogadoId: "u3", advogadoNome: "Dr. Gustavo Mendes", status: "Em andamento",
    dataDistribuicao: "2023-11-22", ultimaMovimentacao: "2024-10-30", proximoPrazo: "2024-03-28",
    valorCausa: "R$ 52.000,00", unidadeId: "u_coc",
    movimentacoes: [
      { id: "m14", data: "2023-11-22", descricao: "Mandado de segurança impetrado", tipo: "peticao" },
    ],
  },
  {
    id: "p8", numero: "0067890-21.2022.8.26.0800", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",
    tipo: "Trabalhista", vara: "1ª Vara do Trabalho", tribunal: "TRT-5",
    advogadoId: "u2", advogadoNome: "Dra. Camila Ferreira", status: "Suspenso",
    dataDistribuicao: "2022-07-18", ultimaMovimentacao: "2024-08-15",
    valorCausa: "R$ 38.000,00", unidadeId: "u_car",
    movimentacoes: [
      { id: "m15", data: "2022-07-18", descricao: "Reclamação trabalhista de ex-funcionário", tipo: "peticao" },
      { id: "m16", data: "2023-04-05", descricao: "Processo suspenso aguardando perícia", tipo: "despacho" },
    ],
  },
];

// ─── Prazos & Tarefas ────────────────────────────────────────────────────────

export const prazos: Prazo[] = [
  { id: "pr1", titulo: "Contestação — Maria Oliveira", processoId: "p1", processoNumero: "0012345-67.2024.8.26.0100", data: "2024-03-22", hora: "23:59", tipo: "prazo_processual", prioridade: "alta", concluido: false, advogadoId: "u2", unidadeId: "u_car" },
  { id: "pr2", titulo: "Defesa Prévia — Carla Souza",  processoId: "p5", processoNumero: "0033456-78.2022.8.26.0500", data: "2024-03-24", hora: "23:59", tipo: "prazo_processual", prioridade: "alta", concluido: false, advogadoId: "u3", unidadeId: "u_car" },
  { id: "pr3", titulo: "Audiência de Conciliação — João Santos", processoId: "p2", processoNumero: "0098765-43.2024.8.26.0200", data: "2024-03-25", hora: "14:00", tipo: "audiencia", prioridade: "alta", concluido: false, advogadoId: "u3", unidadeId: "u_car" },
  { id: "pr4", titulo: "Reunião com Construtora Alfa", clienteNome: "Construtora Alfa Ltda.", data: "2024-03-26", hora: "10:00", tipo: "reuniao", prioridade: "media", concluido: false, advogadoId: "u1", unidadeId: "u_car" },
  { id: "pr5", titulo: "Manifestação — Farmácia Bem Estar", processoId: "p7", processoNumero: "0047382-90.2023.8.26.0700", data: "2024-03-28", hora: "23:59", tipo: "prazo_processual", prioridade: "alta", concluido: false, advogadoId: "u3", unidadeId: "u_coc" },
  { id: "pr6", titulo: "Petição de Recurso — Pedro Lima", processoId: "p4", processoNumero: "0011223-44.2023.8.26.0400", data: "2024-04-05", hora: "23:59", tipo: "prazo_processual", prioridade: "alta", concluido: false, advogadoId: "u2", unidadeId: "u_coc" },
  { id: "pr7", titulo: "Atualizar cadastro de clientes", clienteNome: "Escritório", data: "2024-03-19", hora: "18:00", tipo: "tarefa_interna", prioridade: "baixa", concluido: true, unidadeId: "u_car" },
  { id: "pr8", titulo: "Memoriais — Ana Costa", processoId: "p3", processoNumero: "0055432-12.2023.8.26.0300", data: "2024-04-10", hora: "23:59", tipo: "prazo_processual", prioridade: "media", concluido: false, advogadoId: "u1", unidadeId: "u_coc" },
  { id: "pr9", titulo: "Pericia médica — Pedro Lima", processoId: "p4", processoNumero: "0011223-44.2023.8.26.0400", data: "2024-03-25", hora: "09:00", tipo: "audiencia", prioridade: "alta", concluido: false, advogadoId: "u2", unidadeId: "u_coc" },
  { id: "pr10", titulo: "Renovar procuração — Construtora Alfa", clienteNome: "Construtora Alfa Ltda.", data: "2024-04-15", tipo: "tarefa_interna", prioridade: "media", concluido: true, unidadeId: "u_car" },
];

// ─── Documentos ──────────────────────────────────────────────────────────────

export const pastas: Pasta[] = [
  { id: "pasta_todos", nome: "Todos os Documentos", documentos: 14 },
  { id: "pasta_c1",    nome: "Maria Oliveira",       clienteId: "c1", documentos: 3 },
  { id: "pasta_c1_p1", nome: "Processo Trabalhista", clienteId: "c1", processoId: "p1", parentId: "pasta_c1", documentos: 2 },
  { id: "pasta_c2",    nome: "João Santos",          clienteId: "c2", documentos: 2 },
  { id: "pasta_c2_p2", nome: "Processo Cível",       clienteId: "c2", processoId: "p2", parentId: "pasta_c2", documentos: 2 },
  { id: "pasta_c3",    nome: "Ana Costa",            clienteId: "c3", documentos: 2 },
  { id: "pasta_c6",    nome: "Construtora Alfa Ltda.",clienteId: "c6", documentos: 3 },
  { id: "pasta_c6_p6", nome: "Contrato Empresarial", clienteId: "c6", processoId: "p6", parentId: "pasta_c6", documentos: 2 },
];

export const documentos: Documento[] = [
  { id: "d1",  nome: "Petição Inicial — Maria Oliveira.pdf", tipo: "pdf",  categoria: "peticao",    tamanho: "245 KB", clienteId: "c1", clienteNome: "Maria Oliveira",       processoId: "p1", pastaId: "pasta_c1_p1", dataUpload: "2024-01-16", uploadadoPor: "Dra. Camila Ferreira" },
  { id: "d2",  nome: "Procuração — Maria Oliveira.pdf",      tipo: "pdf",  categoria: "procuracao", tamanho: "89 KB",  clienteId: "c1", clienteNome: "Maria Oliveira",       processoId: "p1", pastaId: "pasta_c1_p1", dataUpload: "2024-01-16", uploadadoPor: "Patrícia Alves" },
  { id: "d3",  nome: "Contrato de Serviços.docx",            tipo: "docx", categoria: "contrato",   tamanho: "132 KB", clienteId: "c1", clienteNome: "Maria Oliveira",       pastaId: "pasta_c1",    dataUpload: "2024-01-10", uploadadoPor: "Patrícia Alves" },
  { id: "d4",  nome: "Contestação — João Santos.pdf",        tipo: "pdf",  categoria: "peticao",    tamanho: "318 KB", clienteId: "c2", clienteNome: "João Santos",          processoId: "p2", pastaId: "pasta_c2_p2", dataUpload: "2024-04-13", uploadadoPor: "Dr. Gustavo Mendes" },
  { id: "d5",  nome: "Procuração — João Santos.pdf",         tipo: "pdf",  categoria: "procuracao", tamanho: "78 KB",  clienteId: "c2", clienteNome: "João Santos",          pastaId: "pasta_c2",    dataUpload: "2024-03-09", uploadadoPor: "Patrícia Alves" },
  { id: "d6",  nome: "Documentos RG + CPF.pdf",              tipo: "pdf",  categoria: "comprovante",tamanho: "210 KB", clienteId: "c2", clienteNome: "João Santos",          processoId: "p2", pastaId: "pasta_c2_p2", dataUpload: "2024-03-09", uploadadoPor: "Patrícia Alves" },
  { id: "d7",  nome: "Acordo de Divórcio — Minuta.docx",     tipo: "docx", categoria: "contrato",   tamanho: "156 KB", clienteId: "c3", clienteNome: "Ana Costa",            processoId: "p3", pastaId: "pasta_c3",    dataUpload: "2024-01-16", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d8",  nome: "Laudo Pericial.pdf",                   tipo: "pdf",  categoria: "comprovante",tamanho: "890 KB", clienteId: "c3", clienteNome: "Ana Costa",            processoId: "p3", pastaId: "pasta_c3",    dataUpload: "2024-02-28", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d9",  nome: "Contrato Social — Construtora Alfa.pdf",tipo: "pdf", categoria: "contrato",   tamanho: "1.2 MB", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",pastaId: "pasta_c6",    dataUpload: "2023-09-10", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d10", nome: "Petição Inicial Empresarial.docx",     tipo: "docx", categoria: "peticao",    tamanho: "245 KB", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",processoId: "p6", pastaId: "pasta_c6_p6", dataUpload: "2024-02-15", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d11", nome: "Tutela Antecipada Deferida.pdf",       tipo: "pdf",  categoria: "sentenca",   tamanho: "320 KB", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",processoId: "p6", pastaId: "pasta_c6_p6", dataUpload: "2024-03-19", uploadadoPor: "Dr. Rafael Viana" },
  { id: "d12", nome: "Planilha de Custas.xlsx",              tipo: "xlsx", categoria: "comprovante",tamanho: "48 KB",  clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",pastaId: "pasta_c6",    dataUpload: "2024-03-01", uploadadoPor: "Patrícia Alves" },
  { id: "d13", nome: "Memorial de Cálculos.docx",            tipo: "docx", categoria: "peticao",    tamanho: "87 KB",  clienteId: "c5", clienteNome: "Carla Souza",           processoId: "p5", pastaId: "pasta_c1",    dataUpload: "2023-10-12", uploadadoPor: "Dr. Gustavo Mendes" },
  { id: "d14", nome: "Sentença Procedente.pdf",              tipo: "pdf",  categoria: "sentenca",   tamanho: "412 KB", clienteId: "c5", clienteNome: "Carla Souza",           processoId: "p5", pastaId: "pasta_c1",    dataUpload: "2023-11-15", uploadadoPor: "Dr. Gustavo Mendes" },
];

// ─── Financeiro ──────────────────────────────────────────────────────────────

export const honorarios: Honorario[] = [
  { id: "h1", clienteId: "c1", clienteNome: "Maria Oliveira",       processoId: "p1", processoNumero: "0012345-67", tipo: "parcelado",  valorTotal: 8000,  parcelasPagas: 2, parcelasTotal: 6, valorParcela: 1334, status: "ativo",     dataInicio: "2024-01-16", proximoVencimento: "2024-04-15", unidadeId: "u_car" },
  { id: "h2", clienteId: "c2", clienteNome: "João Santos",          processoId: "p2",                               tipo: "fixo",       valorTotal: 5000,  parcelasPagas: 1, parcelasTotal: 1,                     status: "pago",      dataInicio: "2024-03-08", unidadeId: "u_car" },
  { id: "h3", clienteId: "c3", clienteNome: "Ana Costa",            processoId: "p3",                               tipo: "risco",      valorTotal: 0,     parcelasPagas: 0, parcelasTotal: 1, percentual: 20,     status: "pendente",  dataInicio: "2023-09-22", unidadeId: "u_coc" },
  { id: "h4", clienteId: "c4", clienteNome: "Pedro Lima",           processoId: "p4",                               tipo: "fixo",       valorTotal: 3500,  parcelasPagas: 0, parcelasTotal: 1,                     status: "em_atraso", dataInicio: "2023-06-14", proximoVencimento: "2024-03-15", unidadeId: "u_coc" },
  { id: "h5", clienteId: "c6", clienteNome: "Construtora Alfa Ltda.",processoId: "p6",processoNumero: "0077889-55", tipo: "parcelado",  valorTotal: 32000, parcelasPagas: 1, parcelasTotal: 12, valorParcela: 2667, status: "ativo",    dataInicio: "2024-02-14", proximoVencimento: "2024-04-14", unidadeId: "u_car" },
  { id: "h6", clienteId: "c7", clienteNome: "Farmácia Bem Estar ME",processoId: "p7",                               tipo: "recorrente", valorTotal: 1200,  parcelasPagas: 5, parcelasTotal: 12, valorParcela: 1200, status: "ativo",    dataInicio: "2023-11-22", proximoVencimento: "2024-04-22", unidadeId: "u_coc" },
];

export const custas: CustaProcessual[] = [
  { id: "cu1", processoId: "p1", processoNumero: "0012345-67", clienteNome: "Maria Oliveira", descricao: "Distribuição — TRT-5", tipo: "distribuicao", valor: 320.50, data: "2024-01-15", pagoBy: "Escritório", reembolsavel: true,  reembolsado: false, unidadeId: "u_car" },
  { id: "cu2", processoId: "p1", processoNumero: "0012345-67", clienteNome: "Maria Oliveira", descricao: "Diligência de citação", tipo: "diligencia",   valor: 150.00, data: "2024-02-05", pagoBy: "Escritório", reembolsavel: true,  reembolsado: false, unidadeId: "u_car" },
  { id: "cu3", processoId: "p2", processoNumero: "0098765-43", clienteNome: "João Santos",    descricao: "Certidão de distribuição", tipo: "certidao",   valor: 45.80,  data: "2024-03-10", pagoBy: "Cliente",   reembolsavel: false, reembolsado: false, unidadeId: "u_car" },
  { id: "cu4", processoId: "p3", processoNumero: "0055432-12", clienteNome: "Ana Costa",      descricao: "Laudo pericial",          tipo: "pericia",     valor: 1800.00,data: "2024-02-28", pagoBy: "Escritório", reembolsavel: true,  reembolsado: false, unidadeId: "u_coc" },
  { id: "cu5", processoId: "p6", processoNumero: "0077889-55", clienteNome: "Construtora Alfa",descricao: "Custas tutelar antecipada",tipo: "publicacao", valor: 280.00, data: "2024-03-19", pagoBy: "Cliente",   reembolsavel: false, reembolsado: false, unidadeId: "u_car" },
  { id: "cu6", processoId: "p7", processoNumero: "0047382-90", clienteNome: "Farmácia Bem Estar",descricao: "Publicação edital",   tipo: "publicacao",  valor: 125.00, data: "2024-03-01", pagoBy: "Escritório", reembolsavel: true,  reembolsado: false, unidadeId: "u_coc" },
];

export const lancamentos: LancamentoFinanceiro[] = [
  { id: "l1",  tipo: "entrada", categoria: "honorario", descricao: "Honorário Maria Oliveira — 2ª parcela", valor: 1334, data: "2024-03-15", unidadeId: "u_car" },
  { id: "l2",  tipo: "entrada", categoria: "honorario", descricao: "Honorário fixo João Santos",            valor: 5000, data: "2024-03-08", unidadeId: "u_car" },
  { id: "l3",  tipo: "entrada", categoria: "honorario", descricao: "Mensalidade Farmácia Bem Estar",        valor: 1200, data: "2024-03-22", unidadeId: "u_coc" },
  { id: "l4",  tipo: "entrada", categoria: "honorario", descricao: "Construtora Alfa — 1ª parcela",         valor: 2667, data: "2024-03-14", unidadeId: "u_car" },
  { id: "l5",  tipo: "saida",   categoria: "salario",   descricao: "Pró-labore — Dr. Rafael Viana",         valor: 8000, data: "2024-03-05", unidadeId: "u_car" },
  { id: "l6",  tipo: "saida",   categoria: "salario",   descricao: "Salário — Patrícia Alves",              valor: 2800, data: "2024-03-05", unidadeId: "u_car" },
  { id: "l7",  tipo: "saida",   categoria: "aluguel",   descricao: "Aluguel escritório — Carinhanha",       valor: 3500, data: "2024-03-01", unidadeId: "u_car" },
  { id: "l8",  tipo: "saida",   categoria: "aluguel",   descricao: "Aluguel escritório — Cocos",            valor: 2800, data: "2024-03-01", unidadeId: "u_coc" },
  { id: "l9",  tipo: "saida",   categoria: "custa",     descricao: "Diligência — Maria Oliveira",           valor: 150,  data: "2024-03-05", unidadeId: "u_car" },
  { id: "l10", tipo: "entrada", categoria: "honorario", descricao: "Honorário Maria Oliveira — 1ª parcela", valor: 1334, data: "2024-02-15", unidadeId: "u_car" },
  { id: "l11", tipo: "saida",   categoria: "material",  descricao: "Material de escritório",               valor: 340,  data: "2024-03-10", unidadeId: "u_car" },
  { id: "l12", tipo: "entrada", categoria: "reembolso", descricao: "Reembolso custas — Ana Costa",          valor: 1800, data: "2024-03-18", unidadeId: "u_coc" },
];

// ─── Notificações ─────────────────────────────────────────────────────────────

export const notificacoes: Notificacao[] = [
  { id: "n1", titulo: "Prazo urgente amanhã", descricao: "Contestação de Maria Oliveira vence em 22/03", tipo: "prazo", lida: false, data: "2024-03-21", hora: "08:00", link: "gestao-kanban" },
  { id: "n2", titulo: "Honorário em atraso", descricao: "Pedro Lima — honorário venceu em 15/03 (R$ 3.500)", tipo: "financeiro", lida: false, data: "2024-03-21", hora: "07:30", link: "dashboard" },
  { id: "n3", titulo: "Novo documento disponível", descricao: "Tutela antecipada juntada no processo da Construtora Alfa", tipo: "documento", lida: false, data: "2024-03-20", hora: "16:45", link: "documentos" },
  { id: "n4", titulo: "Audiência amanhã — João Santos", descricao: "Audiência de conciliação às 14h no TJ-BA", tipo: "prazo", lida: true, data: "2024-03-20", hora: "09:00", link: "gestao-kanban" },
  { id: "n5", titulo: "Prazo crítico em 3 dias", descricao: "Contestação da Construtora Alfa vence em 24/03", tipo: "prazo", lida: true, data: "2024-03-19", hora: "10:00", link: "gestao-kanban" },
];

// ─── Logs de Auditoria ───────────────────────────────────────────────────────

export const logsAuditoria: LogAuditoria[] = [
  { id: "log1", usuarioNome: "Dr. Rafael Viana",   usuarioPapel: "administrador", acao: "acessou",   modulo: "sistema",    descricao: "Login no sistema",                           data: "21/03/2024", hora: "08:12", ip: "192.168.1.10" },
  { id: "log2", usuarioNome: "Dra. Camila Ferreira",usuarioPapel: "advogado",     acao: "criou",     modulo: "processos",  descricao: "Criou processo p1 — Maria Oliveira",         data: "21/03/2024", hora: "09:05", ip: "192.168.1.11" },
  { id: "log3", usuarioNome: "Patrícia Alves",      usuarioPapel: "secretaria",   acao: "fez_upload",modulo: "documentos", descricao: "Upload: Procuração Maria Oliveira.pdf",      data: "21/03/2024", hora: "09:22", ip: "192.168.1.12" },
  { id: "log4", usuarioNome: "Dr. Rafael Viana",   usuarioPapel: "administrador", acao: "editou",    modulo: "processos",  descricao: "Atualizou status do processo p6 para Urgente",data: "21/03/2024", hora: "10:30", ip: "192.168.1.10" },
  { id: "log5", usuarioNome: "Dr. Gustavo Mendes", usuarioPapel: "advogado",      acao: "visualizou",modulo: "clientes",   descricao: "Visualizou ficha de Ana Costa",              data: "20/03/2024", hora: "14:15", ip: "192.168.1.13" },
  { id: "log6", usuarioNome: "Dra. Camila Ferreira",usuarioPapel: "advogado",     acao: "criou",     modulo: "prazos",     descricao: "Criou prazo: Contestação Maria Oliveira",    data: "20/03/2024", hora: "11:00", ip: "192.168.1.11" },
  { id: "log7", usuarioNome: "Patrícia Alves",      usuarioPapel: "secretaria",   acao: "baixou",    modulo: "documentos", descricao: "Download: Petição Inicial João Santos.pdf",  data: "20/03/2024", hora: "15:40", ip: "192.168.1.12" },
  { id: "log8", usuarioNome: "Dr. Rafael Viana",   usuarioPapel: "administrador", acao: "criou",     modulo: "financeiro", descricao: "Registrou honorário: Construtora Alfa — R$32.000",data: "19/03/2024", hora: "09:00", ip: "192.168.1.10" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getProcessosByCliente = (clienteId: string) =>
  processos.filter(p => p.clienteId === clienteId);

export const getProcessoById = (processoId: string) =>
  processos.find(p => p.id === processoId);

export const getHonorariosByProcesso = (processoId: string) =>
  honorarios.filter(h => h.processoId === processoId);

export const getCustasByProcesso = (processoId: string) =>
  custas.filter(c => c.processoId === processoId);

export const getNotificacoesNaoLidas = () =>
  notificacoes.filter(n => !n.lida);
