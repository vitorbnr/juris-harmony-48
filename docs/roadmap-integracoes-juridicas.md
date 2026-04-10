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

## Fase 5

- Kanban juridico.
- Calculo de prazos com regras do escritorio.
- Preparacao da base historica para IA futura.
