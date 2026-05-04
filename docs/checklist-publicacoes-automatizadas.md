# Checklist - Publicacoes Automatizadas

Data: 04/05/2026

Este documento e a fonte de verdade do plano ativo de publicacoes. Sempre que uma etapa for implementada, testada ou homologada, o item correspondente deve ser atualizado aqui.

Legenda:

- `[x]` feito no sistema ou decisao registrada
- `[ ]` pendente
- `[congelado]` fora do plano ativo, mantido apenas como possibilidade futura

## Decisoes de escopo

- [x] Usar DJEN/Comunica PJe como fonte primaria de publicacoes judiciais por OAB/nome.
- [x] Usar DataJud como enriquecimento de capa, classe, orgao julgador e movimentacoes publicas.
- [x] Manter DOU/INLABS fora do core de publicacoes.
- [x] Manter diarios administrativos, municipais, MPs, defensorias, TCs, OAB, INPI, CVM, BCB e juntas comerciais fora do MVP automatico.
- [x] [congelado] Domicilio Judicial Eletronico fica fora do plano ativo neste momento.
- [ ] Reavaliar Domicilio Judicial Eletronico somente depois que o nucleo DJEN/DataJud estiver homologado em producao.
- [ ] PJe/PDPJ/e-SAJ/Projudi/Eproc autenticados entram apenas depois de credenciais, escopo e risco operacional definidos.

## Guardrails obrigatorios

- [x] Nao criar prazo fatal definitivo automaticamente.
- [x] Nao registrar ciencia, aceite ou abertura sensivel automaticamente.
- [x] Toda publicacao descartada exige motivo.
- [x] Toda publicacao tratada deve manter historico e rastreabilidade.
- [x] Tarefa interna automatica de triagem e permitida porque nao registra ciencia nem define prazo fatal.
- [ ] IA deve ser assistiva: sugerir, resumir, classificar e explicar; a acao juridica final continua humana.
- [ ] Toda sugestao de IA deve expor confianca, motivo e trechos usados.
- [ ] Toda resposta de IA deve ser auditavel e reprocessavel.

## Captura DJEN/Comunica

- [x] Cliente HTTP para `GET /api/v1/comunicacao`.
- [x] Busca direta por OAB/UF e nome do advogado.
- [x] Paginacao, timeout, retry e backoff.
- [x] Deduplicacao por hash/origem.
- [x] Extracao de CNJ do texto.
- [x] Filtro local contra fontes monitoradas do escritorio.
- [x] Fallback por caderno DJEN quando aplicavel.
- [x] Scheduler automatico configuravel por `DJEN_SYNC_CRON`.
- [x] Lock de execucao para evitar duas coletas DJEN simultaneas.
- [x] Replay manual por data/tribunal.
- [x] Reprocessamento seletivo de captura com erro.
- [x] Backfill global por periodo.
- [x] Backfill inicial automatico por fonte `NOME`/`OAB`.
- [ ] Ativar `DJEN_SYNC_ENABLED=true` no ambiente alvo.
- [ ] Homologar captura com OABs reais por pelo menos 7 dias uteis.
- [ ] Medir falsos positivos, falsos negativos, volume diario e tempo de execucao.

## Descoberta de carteira

- [x] Buscar publicacoes por OAB/nome sem depender de planilha inicial.
- [x] Manter publicacoes com CNJ desconhecido na fila `SEM_VINCULO`.
- [x] Criar processo a partir de publicacao sem vinculo via `POST /api/publicacoes/{id}/processo`.
- [x] Preencher cadastro de processo com CNJ capturado.
- [x] Consultar DataJud no fluxo assistido quando o CNJ for valido.
- [ ] Sugerir cliente provavel, parte contraria, polo e responsavel usando texto da publicacao + DataJud.
- [ ] Criar painel de saneamento de carteira descoberta: candidatos, duplicados, sem CNJ, homonimos e vinculados.
- [ ] Executar backfill historico em janelas mensais e registrar cobertura por periodo.

## Tratamento operacional

- [x] Fila paginada de publicacoes.
- [x] Filtros no backend: status, busca, risco, minhas, hoje e fluxo.
- [x] Detalhe dedicado de publicacao.
- [x] Vincular publicacao a processo.
- [x] Assumir ou atribuir responsavel.
- [x] Descartar com motivo.
- [x] Criar tarefa, prazo ou audiencia a partir da publicacao.
- [x] Vinculo `publicacao -> evento_juridico -> prazo/tarefa/audiencia`.
- [x] Exibir atividades vinculadas dentro da publicacao.
- [ ] Melhorar UX de tratamento em lote para alto volume.
- [ ] Criar regras de SLA por responsavel/equipe para publicacoes nao tratadas.

## Tratamento de publicacao com IA

Objetivo: reduzir tempo de leitura e triagem, sem substituir a decisao juridica humana.

- [x] Triagem deterministica local para prazo, audiencia, providencia, urgencia e vinculo.
- [x] Campos de sugestao ja existentes: acao sugerida, prazo sugerido, risco, prioridade, confianca, resumo e trechos relevantes.
- [ ] Definir contrato JSON da IA para tratamento de publicacao.
- [ ] Criar servico de IA configuravel e desligado por padrao.
- [ ] Gerar resumo juridico-operacional da publicacao.
- [ ] Classificar tipo de ato: intimacao, citacao, despacho, decisao, sentenca, acordao, audiencia, providencia, mero expediente ou outro.
- [ ] Identificar prazo mencionado, termo inicial aparente e risco de prazo.
- [ ] Sugerir acao operacional: vincular processo, criar tarefa, criar prazo, criar audiencia, revisar, descartar ou escalar.
- [ ] Sugerir titulo e descricao de tarefa/prazo/audiencia.
- [ ] Sugerir responsavel com base em processo, cliente, unidade, destinatarios e historico.
- [ ] Sugerir cliente provavel, parte contraria e polo quando a publicacao estiver sem processo.
- [ ] Exibir explicacao curta e trechos do texto usados pela IA.
- [ ] Salvar versao da analise para auditoria.
- [ ] Botao para reprocessar IA manualmente.
- [ ] Testes unitarios com exemplos reais anonimizados.
- [ ] Homologacao com publicacoes reais do escritorio antes de qualquer automacao mais forte.

## DataJud

- [x] Cliente DataJud.
- [x] Sincronizacao de processos ativos com CNJ.
- [x] Enriquecimento de movimentacoes publicas.
- [x] Uso no cadastro assistido de processo a partir de publicacao.
- [ ] Validacao cruzada mais forte entre CNJ da publicacao e capa DataJud.
- [ ] Sugestao automatica de partes e cliente provavel.
- [ ] Monitorar falhas por tribunal/indice DataJud.

## Administracao e observabilidade

- [x] Historico agregado diario de captura DJEN.
- [x] Painel de SLA por diario DJEN.
- [x] Alerta automatico para diario com erro ou atrasado.
- [x] Auditoria detalhada de captura: status, erro, HTTP, duracao, lidas e importadas.
- [x] Historico de backfill DJEN por fonte monitorada: status, periodo, lidas, importadas, falhas e mensagem.
- [x] Status completo por fonte monitorada: ultima busca recorrente, ultimo backfill, importadas, falhas e proxima execucao.
- [x] Backfill por fonte assincrono, com execucao `PENDENTE` e acompanhamento pela tabela administrativa.
- [ ] Retry e retomada de backfill por fonte com controle operacional dedicado.
- [ ] Alertas por fonte monitorada, nao apenas por diario.
- [ ] Dashboard de disponibilidade historica por diario/tribunal/fonte.
- [ ] Comparativo de volume esperado por periodo.

## Integracoes congeladas ou futuras

- [x] [congelado] Domicilio Judicial Eletronico: nao faz parte do plano ativo atual.
- [ ] PJe/PDPJ autenticado: futuro, depende de credenciais, escopo e autorizacao.
- [ ] e-SAJ/Projudi/Eproc autenticados: futuro, depende de credenciais e analise de risco.
- [ ] Fornecedor externo: apenas pesquisa comparativa, sem uso no plano atual.

## Proxima ordem de implementacao

- [x] Criar historico inicial de backfill por fonte monitorada.
- [x] Evoluir status por fonte para captura recorrente e proxima execucao.
- [x] Transformar backfill por fonte em job assincrono com progresso basico.
- [ ] Adicionar retry/retomada para backfill por fonte.
- [ ] Implementar contrato e servico base de IA assistiva para publicacoes.
- [ ] Integrar sugestoes de IA na tela de tratamento.
- [ ] Adicionar sugestao DataJud de partes/cliente provavel.
- [ ] Rodar homologacao com dados reais e atualizar este checklist.
