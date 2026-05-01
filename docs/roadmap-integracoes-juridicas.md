# Roadmap de Integracoes Juridicas Sem IA

## Objetivo

Construir no Juris Harmony uma base gratuita e segura para monitoramento juridico continuo, sem automatizar atos que possam registrar ciencia ou iniciar prazo.

## Regra critica

- O sistema pode coletar, organizar, alertar e vincular comunicacoes.
- O sistema nao deve abrir automaticamente comunicacoes sensiveis nem praticar aceite/ciencia em nome do escritorio.
- Toda comunicacao critica deve passar por triagem humana antes de gerar acao juridica definitiva.

## Fase 1

### Escopo

- Sincronizacao automatica do Datajud para processos ativos com numero CNJ.
- Registro do estado da integracao no banco.
- Notificacao dos advogados responsaveis quando surgirem novas movimentacoes.

### Entregas implementadas

- Tabela `fontes_sync` para rastrear status das coletas por fonte.
- Job recorrente `DatajudSyncScheduler`, hoje configurado por padrao a cada 4 horas.
- Integracao do `ProcessoService` com notificacoes e historico de sincronizacao.
- Endpoint manual `POST /api/processos/{id}/sincronizar-datajud` para demonstracao e reprocessamento sob demanda.
- Endpoint manual `POST /api/processos/sincronizar-datajud` para reprocessamento em lote.

### Como apresentar no escritorio

- O sistema ja consegue atualizar automaticamente movimentacoes publicas do Datajud sem depender de abertura manual do processo.
- A captura de movimentacoes deixou de ser apenas diaria e passou a ocorrer varias vezes ao dia, com reprocessamento sob demanda pela interface.
- Cada sincronizacao passa a deixar trilha de sucesso ou erro no banco.
- Quando houver movimentacoes novas, os responsaveis podem ser alertados sem risco de pratica automatica de ato processual.

## Fase 2

- Inbox juridica de eventos.
- Etiquetas e filtros por urgencia, fase e responsavel.
- Registro centralizado de publicacoes, intimacoes e movimentacoes.
- Estrutura de partes e representantes para cenarios com multiplos polos e varios advogados por parte.

## Fase 3

- Integracao com Domicilio Judicial Eletronico.
- Triagem segura de comunicacoes, sem ciencia automatica.
- Auditoria de visualizacao e confirmacao manual.

### Fundacao implementada

- Configuracao segura do Domicilio via variaveis de ambiente.
- Cliente read-only para autenticacao OAuth e consulta de comunicacoes.
- Endpoint manual de sincronizacao para importar comunicacoes para a Inbox Juridica.
- Scheduler opcional para coleta recorrente quando a integracao estiver habilitada.
- Guardrail permanente: nenhuma rotina abre inteiro teor nem registra ciencia automaticamente.
- Vinculacao automatica ao processo por numero CNJ e distribuicao sugerida por destinatario quando houver representantes internos estruturados.

## Fase 4

- Integracao com Jus.br / DJEN quando operacionalmente estabilizada.
- Vinculacao automatica de publicacoes aos processos.
- Agenda e tarefas derivadas das comunicacoes.

### Entregas implementadas nesta fase

- Acao manual assistida na Inbox Juridica para criar prazo a partir de um evento.
- Vinculo `prazo -> evento juridico` para manter rastreabilidade da origem operacional.
- Atualizacao automatica do campo `proximoPrazo` do processo quando prazos sao criados, editados, concluidos ou excluidos.
- A criacao do prazo a partir do evento coloca o item em `EM_TRIAGEM`, sem concluir automaticamente o fluxo.
- Eventos de `intimacao` e `publicacao` agora geram automaticamente uma `tarefa interna de triagem` para o responsavel, sem criar prazo fatal automaticamente.
- A tela de `Prazos & Tarefas` agora possui um quadro `Kanban` para tarefas internas, com etapas `A Fazer`, `Em andamento` e `Concluido`.
- O sistema agora gera alertas internos deduplicados para prazos e tarefas que estao atrasados, vencem hoje, vencem amanha ou se aproximam em 3 dias.
- O dashboard passou a mostrar um `Painel de urgencia` com contadores de atrasos, vencimentos do dia e tarefas abertas.
- O modulo de Publicacoes agora permite tratar publicacoes criando tarefa, prazo ou audiencia diretamente da publicacao.
- O tratamento cria ou reutiliza um `evento_juridico` de origem `PUBLICACAO`, vincula a atividade criada e marca a publicacao como tratada.
- A publicacao passou a exibir `atividadesVinculadas`, permitindo confirmar quais tarefas, prazos ou audiencias nasceram daquela captura.
- A fila de publicacoes passou a usar endpoint paginado `GET /api/publicacoes/page`, com filtros executados no backend e detalhe dedicado `GET /api/publicacoes/{id}`.
- Capturas DJEN com erro podem ser reprocessadas seletivamente por `POST /api/publicacoes/capturas/{id}/reprocessar`, sem rodar a coleta inteira.
- A aba administrativa passou a mostrar SLA por diario DJEN, com status `SAUDAVEL`, `SEM_CADERNO`, `SEM_MATCH`, `ERRO`, `ATRASADO` e `NUNCA_EXECUTADO`.
- O backend agora gera alerta automatico deduplicado para administradores quando diario DJEN fica com status `ERRO` ou `ATRASADO` pelo SLA configurado.
- A triagem de publicacoes passou a usar regras locais explicaveis para sugerir vinculo, prazo, audiencia, tarefa ou revisao/arquivamento, sem depender de modelo externo.
- Publicacoes capturadas com responsavel resolvido agora geram automaticamente uma `TAREFA_INTERNA` de triagem vinculada ao evento juridico da publicacao, sem criar prazo fatal automaticamente.
- O monitoramento administrativo passou a exibir historico diario agregado DJEN, com execucoes, falhas, publicacoes lidas e publicacoes importadas por data de referencia.
- DOU/INLABS foi removido do core de publicacoes; a fonte principal de diario judicial permanece DJEN/Comunica PJe.
- A coleta DJEN passou a priorizar `GET /api/v1/comunicacao` por OAB/nome do advogado em modo global por data, mantendo caderno DJEN como fallback quando a busca direta falha ou quando houver fonte sem suporte direto.
- Foi adicionado backfill global por periodo em `POST /api/publicacoes/coleta/djen?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` para descoberta inicial de publicacoes/processos candidatos sem depender de planilha.
- Foi adicionado `POST /api/publicacoes/{id}/processo` para criar processo a partir de publicacao `SEM_VINCULO`, validar o CNJ capturado e vincular a publicacao na mesma operacao.
- Foi criado o documento `docs/implementacao-captura-comunica-djen-datajud.md` com arquitetura, configuracoes, guardrails e plano de homologacao.
- Foi criado o documento `docs/cobertura-siglas-publicacoes.md` com a matriz de siglas, cobertura DJEN e perdas esperadas fora do Judiciario.

## Fase 5

- Kanban juridico.
- Calculo de prazos com regras do escritorio.
- Preparacao da base historica para IA futura.
- Disponibilidade historica por diario/tribunal DJEN e comparativo de volume esperado.
- Homologacao de PJe/PDPJ somente apos confirmacao de credenciais e escopo real.
