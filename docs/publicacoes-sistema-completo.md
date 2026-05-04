# Sistema de Publicacoes - plano operacional completo

Data: 30/04/2026

Checklist ativo: `docs/checklist-publicacoes-automatizadas.md`

## Premissa de produto

O modulo de publicacoes existe para reduzir consulta manual em diarios e transformar captura juridica em trabalho operacional rastreavel. Ele nao deve ser apenas uma tela de alertas. A cadeia correta e:

1. cadastrar nomes, OAB, CPF ou CNPJ monitorados
2. coletar fontes oficiais automaticamente
3. filtrar pelo que pertence ao escritorio
4. vincular ao processo quando houver CNJ
5. alertar o responsavel correto
6. tratar a publicacao criando tarefa, prazo, audiencia ou descarte justificado
7. manter trilha de auditoria e indicadores

## Foco

O foco atual e reproduzir o valor pratico do fluxo de publicacoes do Astrea, mas com uma arquitetura propria:

- monitoramento por nomes/OAB/CPF/CNPJ do escritorio
- DJEN/Comunica PJe como fonte primaria coletavel
- DataJud como fonte auxiliar de movimentacoes publicas e validacao de contexto
- triagem operacional dentro do sistema
- tratamento de publicacoes com IA assistiva, sem ato automatico definitivo
- criacao de tarefas, prazos e audiencias a partir da publicacao
- historico e rastreabilidade da origem

## Fora do core

DOU/INLABS fica fora do plano principal. Para o objetivo do escritorio, ele agrega pouco na captura de publicacoes judiciais por advogado/escritorio e aumenta ruido operacional. Se um dia houver necessidade especifica de atos administrativos federais, deve entrar como modulo separado e opt-in, nao como fonte padrao.

Domicilio Judicial Eletronico tambem fica congelado fora do plano ativo neste momento. A decisao pode ser reavaliada no futuro, mas a prioridade atual e fechar DJEN/Comunica, DataJud, descoberta de carteira e tratamento de publicacoes com IA assistiva.

## Fontes e finalidade

### DJEN / Comunica PJe

Fonte principal para publicacoes judiciais. O sistema usa primeiro a busca direta oficial por comunicacao (`/api/v1/comunicacao`) com `numeroOab`, `ufOab` ou `nomeAdvogado`, de forma global por data. O caderno por tribunal/data fica como fallback e auditoria.

O que agrega:

- captura direta por nome/OAB do escritorio
- menor volume e menos ruido que baixar todos os cadernos por padrao
- automacao diaria
- replay por tribunal/data para recuperacao
- deduplicacao por hash
- vinculacao por CNJ quando encontrado no teor

### DataJud

Fonte auxiliar para movimentacoes processuais publicas. Nao substitui DJEN porque nao entrega a mesma experiencia de publicacoes por nome/OAB. Serve para enriquecer processos, validar contexto institucional e identificar movimentacoes seguras.

O que agrega:

- capa e movimentacoes publicas
- validacao de processo existente
- contexto para triagem
- possivel apoio para detectar publicacoes/movimentos relevantes

### Domicilio Judicial Eletronico - congelado

Fonte institucional sensivel. Nao faz parte do plano ativo atual.

Motivo da decisao:

- exige credenciais institucionais e validacao operacional propria
- pode envolver comunicacoes sensiveis e risco de ciencia/abertura indevida
- nao e necessario para fechar o primeiro nucleo automatizado de publicacoes judiciais por OAB/nome

Restricao permanente se for retomado no futuro:

- sem ciencia automatica
- sem aceite automatico
- sem abertura automatica de conteudo que possa iniciar prazo

### PDPJ / PJe

Servem como caminho institucional para integracoes futuras, especialmente quando houver credenciais, escopo e documentacao operacional validos. Nao devem ser tratados como garantia de que retornarao todas as publicacoes de diarios. Na pratica, cada API tem escopo proprio, autenticacao e regras de acesso.

O que agrega:

- caminho oficial
- possibilidade de integracao por credenciais
- base para intimações eletronicas e dados processuais

## Como a captura funciona hoje

### Cadastro

O escritorio cadastra fontes monitoradas em `publicacoes_fontes_monitoradas`, com:

- tipo: `NOME`, `OAB`, `CPF`, `CNPJ`
- valor monitorado
- nome de exibicao
- diarios monitorados
- destinatarios internos
- status ativo/inativo

### Coleta DJEN

O job DJEN roda conforme configuracao:

- `DJEN_SYNC_ENABLED`
- `DJEN_SYNC_CRON`
- `DJEN_SYNC_LOOKBACK_DAYS`
- `DJEN_TRIBUNAIS`
- `DJEN_CADERNO_TIPO`
- `DJEN_COMUNICACAO_ENABLED`
- `DJEN_CADERNO_FALLBACK_ENABLED`
- `DJEN_CADERNO_FALLBACK_ON_EMPTY`
- `DJEN_SYNC_LOCK_TTL_MINUTES`
- `DJEN_BACKFILL_MAX_DAYS`
- `DJEN_SYNC_SLA_HOURS`

O cliente HTTP usa:

- `DJEN_API_BASE_URL`
- `DJEN_USER_AGENT`
- `DJEN_TIMEOUT_SECONDS`
- `DJEN_RETRY_ATTEMPTS`
- `DJEN_RETRY_BACKOFF_MS`
- `DJEN_COMUNICACAO_PAGE_SIZE`
- `DJEN_COMUNICACAO_MAX_PAGES`

### Processamento

Para cada data avaliada:

1. busca comunicacoes diretamente por OAB ou nome do advogado, sem exigir tribunal
2. pagina resultados da API oficial
3. agrega duplicidades entre buscas por nome/OAB
4. filtra localmente pelos monitorados ativos
5. usa caderno DJEN como fallback quando a busca direta falha ou quando ha fonte sem busca direta
6. procura CNJ no conteudo
7. gera request de ingestao
8. deduplica por hash
9. salva publicacao
10. notifica destinatarios definidos e responsavel do processo quando houver

### Replay

Existe endpoint de replay:

- `POST /api/publicacoes/coleta/djen?tribunal=TJSP&data=YYYY-MM-DD`

Ele deve ser usado para suporte, recuperacao de falhas e homologacao. O fluxo normal deve ser automatico via scheduler.

Existe tambem endpoint de backfill global por periodo:

- `POST /api/publicacoes/coleta/djen?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD`

Ele serve para descoberta inicial de carteira quando nao ha planilha. O sistema busca publicacoes por OAB/nome, extrai CNJs e deixa o que nao tiver processo cadastrado na fila `SEM_VINCULO` para conferencia e criacao/vinculacao assistida. Por padrao, a janela maxima por execucao e `DJEN_BACKFILL_MAX_DAYS=31`.

Na interface administrativa, o bloco `Descobrir carteira` em Configuracoes > Publicacoes executa esse endpoint por intervalo de datas, sem exigir chamada manual de API.

Ao cadastrar uma nova pesquisa por `NOME` ou `OAB`, a interface dispara automaticamente um backfill inicial daquela fonte nos ultimos 30 dias:

- `POST /api/publicacoes/fontes-monitoradas/{id}/backfill-djen?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD`

Cada linha da tabela tambem possui acao para repetir esse backfill por fonte. Esse endpoint e propositalmente limitado a busca direta DJEN/Comunica e nao executa fallback por caderno, para evitar uma carga excessiva quando a fonte e especifica.

Para tratar uma publicacao sem vinculo e criar o processo na mesma operacao:

- `POST /api/publicacoes/{id}/processo`

Esse endpoint recebe os dados confirmados do cadastro de processo, valida o CNJ capturado, cria o processo e vincula a publicacao. Na interface, o botao `Cadastrar Processo` aparece quando a publicacao tem CNJ valido e ainda nao esta vinculada.

Existe tambem retentativa seletiva a partir de uma captura com erro:

- `POST /api/publicacoes/capturas/{id}/reprocessar`

Esse endpoint reusa tribunal e data da execucao com erro, mantendo o mesmo lock global de DJEN. Ele aceita apenas capturas DJEN com status `ERRO`, para evitar reprocessar execucoes saudaveis por engano.

## Guardrails operacionais

- Captura automatica e permitida para DJEN porque e fonte publica de diario.
- Domicilio Judicial esta congelado fora do plano ativo.
- O sistema nunca deve criar prazo fatal automaticamente sem decisao humana.
- A triagem pode sugerir risco e acao, mas a criacao definitiva de tarefa/prazo/audiencia e ato do usuario.
- Toda publicacao descartada exige motivo.
- Todo tratamento registra historico.

## Tratamento implementado

Na tela de Publicacoes, o usuario pode:

- vincular a publicacao a um processo
- atribuir para responsavel
- assumir tratamento
- reprocessar triagem inteligente
- descartar com motivo
- criar tarefa
- criar prazo
- criar audiencia

Na ingestao automatica, quando a publicacao tem responsavel resolvido pelo processo ou pelos destinatarios da fonte monitorada, o sistema tambem cria uma tarefa interna de triagem vinculada ao evento juridico da publicacao. Essa tarefa coloca a publicacao na fila operacional de `Prazos & Tarefas` sem criar prazo processual fatal.

## Triagem automatica local

Cada publicacao importada passa por `PublicacaoTriagemInteligenteService` antes de entrar na fila. A triagem atual e deterministica e nao depende de IA externa. Ela normaliza acentos, le termos juridicos e preenche:

- `iaAcaoSugerida`: `VINCULAR_PROCESSO`, `CRIAR_PRAZO`, `CRIAR_AUDIENCIA`, `CRIAR_TAREFA` ou `REVISAR_ARQUIVAR`
- `iaPrazoSugeridoDias`: prazo numerico encontrado no texto, quando houver
- `riscoPrazo`: flag para fila de publicacoes com prazo, audiencia ou urgencia
- `scorePrioridade`: ordenacao operacional da fila
- `iaConfianca`: confianca da regra aplicada
- `resumoOperacional`: leitura curta do que deve ser feito
- `justificativaPrioridade`: motivos explicaveis da classificacao
- `iaTrechosRelevantes`: linha do teor que motivou a sugestao
- `ladoProcessualEstimado`: polo processual quando o texto permitir inferir

Regras ja cobertas:

- prazo expresso em dias, inclusive com acentos e variacoes como `prazo comum de 15 dias`
- audiencia, sessao, conciliacao e instrucao
- comandos operacionais como `cite-se`, `cumpra-se`, `oficie-se`, bloqueio, penhora e alvara
- decurso de prazo tratado como tarefa/providencia, nao como novo prazo
- urgencia, liminar, tutela de urgencia, plantao e medidas constritivas
- publicacao sem processo vinculado sempre sugere vincular processo antes de criar atividade

Guardrail: a triagem sugere; ela nao cria prazo, tarefa ou audiencia automaticamente. A criacao continua sendo ato humano na tela de Publicacoes.

Excecao segura: o sistema pode criar automaticamente uma `TAREFA_INTERNA` de triagem, porque ela nao registra ciencia, nao aceita comunicacao e nao define prazo fatal. Essa tarefa serve apenas para obrigar revisao humana.

## Tratamento com IA assistiva

O tratamento com IA entra no plano ativo como camada de apoio sobre a triagem atual. A IA deve resumir, classificar e sugerir a acao operacional, mas nao pode praticar ato juridico definitivo.

O que a IA deve agregar:

- resumo juridico-operacional da publicacao
- classificacao do ato processual
- identificacao de prazo mencionado e risco de prazo
- sugestao de tarefa, prazo, audiencia, vinculo, descarte ou revisao
- sugestao de responsavel, cliente provavel e parte contraria quando houver contexto suficiente
- explicacao da sugestao com trechos relevantes do texto

Guardrail: a IA nao cria prazo fatal, nao descarta publicacao, nao vincula processo e nao registra ciencia automaticamente. Ela prepara uma sugestao auditavel para confirmacao humana.

## Fila e escala

A fila operacional de publicacoes nao deve carregar tudo de uma vez. O frontend usa o endpoint paginado:

- `GET /api/publicacoes/page`

Parametros principais:

- `status`
- `busca`
- `somenteRiscoPrazo`
- `statusFluxo`
- `somenteHoje`
- `minhas`
- `page`
- `size`

O endpoint antigo `GET /api/publicacoes` foi mantido por compatibilidade, mas a tela principal deve usar a versao paginada. Os filtros de `sem vinculo`, `sem responsavel`, `prazo suspeito`, `minhas publicacoes` e `hoje` precisam rodar no backend; filtrar no frontend depois da paginacao distorce o total e pode esconder registros.

O detalhe usa endpoint proprio:

- `GET /api/publicacoes/{id}`

Isso permite manter a lista leve e recarregar o detalhe da publicacao selecionada com os dados mais atuais, incluindo atividades vinculadas.

Ao criar tarefa, prazo ou audiencia:

1. o backend exige processo vinculado
2. cria ou reutiliza um `evento_juridico` de origem `PUBLICACAO`
3. cria o item em `prazos`
4. vincula `prazo -> evento_juridico -> publicacao`
5. marca a publicacao como tratada
6. registra historico
7. retorna a publicacao atualizada com `atividadesVinculadas`

Quando a tarefa automatica de triagem e criada, o mesmo vinculo `publicacao -> evento_juridico -> prazo/tarefa` e usado. Isso permite ver a tarefa dentro da publicacao e tambem trabalhar a triagem pelo Kanban/agenda.

## Rastreabilidade visual

A resposta de publicacao agora inclui `atividadesVinculadas`. A tela mostra quais tarefas, prazos ou audiencias foram criados a partir da publicacao, com:

- tipo
- titulo
- data
- hora
- status aberto/concluido
- responsavel
- evento juridico de origem

Isso evita que o usuario trate a publicacao e depois precise procurar manualmente se o prazo ou tarefa foi realmente criado.

## Auditoria e confiabilidade

As execucoes de captura registram:

- fonte
- diario/tribunal
- data de referencia
- status
- cadernos consultados
- cadernos baixados
- publicacoes lidas
- publicacoes importadas
- falhas
- tipo de erro
- codigo HTTP
- detalhe interno de erro
- inicio, fim e duracao

Existe lock de job para impedir duas coletas DJEN simultaneas:

- tabela `publicacoes_jobs_locks`
- lock `PUBLICACOES_DJEN_SYNC`
- TTL configuravel

Falhas automaticas DJEN podem notificar administradores uma vez por dia.
O SLA por diario tambem possui alerta automatico deduplicado para administradores quando houver diario com status `ERRO` ou `ATRASADO`.

## SLA de captura por diario

O monitoramento administrativo calcula a saude dos diarios DJEN com coletor ativo a partir das execucoes salvas em `publicacoes_capturas_execucoes`.

O SLA padrao e configurado por:

- `DJEN_SYNC_SLA_HOURS`, padrao `36`

O alerta automatico de SLA e configurado por:

- `DJEN_SLA_ALERT_ENABLED`, padrao `true`
- `DJEN_SLA_ALERT_CRON`, padrao `0 15 8 * * *`
- `DJEN_SLA_ALERT_MAX_ITENS`, padrao `8`
- `DJEN_SLA_ALERTAR_NUNCA_EXECUTADO`, padrao `false`

O historico agregado exibido no monitoramento e configurado por:

- `DJEN_SYNC_HISTORY_DAYS`, padrao `14`

Status possiveis por diario:

- `SAUDAVEL`: ultima execucao dentro do SLA e sem erro
- `SEM_CADERNO`: diario consultado, mas sem caderno publicado para a data
- `SEM_MATCH`: caderno lido, mas nenhuma publicacao bateu com os nomes/OAB/CPF/CNPJ monitorados
- `ERRO`: ultima execucao falhou
- `ATRASADO`: coletor ativo sem execucao dentro da janela de SLA
- `NUNCA_EXECUTADO`: coletor ativo, mas sem historico de execucao

Na interface administrativa, o painel mostra:

- total de coletores DJEN ativos
- saudaveis
- com erro
- atrasados
- sem match
- nunca executados
- lista priorizada por criticidade

Esse painel separa falha tecnica de situacao normal de negocio. Por exemplo, `SEM_MATCH` nao significa erro: significa que o caderno foi lido e nao havia publicacao para as pesquisas cadastradas.

O scheduler `PublicacaoDjenSlaAlertaScheduler` roda independentemente da tela administrativa. Ele consulta a mesma saude calculada para o painel, prioriza `ERRO`, depois `ATRASADO`, e cria notificacao interna para administradores com link para `Configuracoes > Publicacoes`. O alerta e deduplicado por dia para evitar ruido se o job rodar mais de uma vez.

Por padrao, `NUNCA_EXECUTADO` nao dispara alerta. Isso evita ruido durante implantacao ou antes da primeira homologacao real. Se o escritorio quiser tratar coletor ativo sem historico como problema operacional, basta habilitar `DJEN_SLA_ALERTAR_NUNCA_EXECUTADO=true`.

O painel tambem mostra historico diario DJEN por data de referencia, agregando execucoes, sucessos, erros, publicacoes lidas e publicacoes importadas. Isso ajuda a identificar buracos de captura, queda de volume ou falha recorrente sem depender apenas da ultima execucao.

## Migrations relevantes

- `V32__create_table_publicacoes_fontes_monitoradas.sql`
- `V33__publicacoes_catalogo_oficial_destinatarios.sql`
- `V34__publicacoes_catalogo_astrea_diarios.sql`
- `V35__publicacoes_capturas_execucoes.sql`
- `V36__publicacoes_remover_dou_catalogo.sql`
- `V37__publicacoes_jobs_locks.sql`
- `V38__publicacoes_capturas_erro_detalhado.sql`
- `V39__eventos_juridicos_vincular_publicacao.sql`
- `V40__publicacoes_fontes_sync_execucoes.sql`

## O que ja esta pronto

- catalogo de diarios monitorados, sem DOU no core
- fontes monitoradas por nome/OAB/CPF/CNPJ
- destinatarios por fonte monitorada
- coleta DJEN com timeout, retry e backoff
- parser tolerante a ZIP/JSON parcial
- deduplicacao por hash
- extracao de CNJ
- importacao local apenas quando houver match com monitorados
- notificacao de responsaveis
- scheduler automatico configuravel
- replay manual de suporte
- retentativa seletiva de captura DJEN com erro
- fila paginada de publicacoes
- endpoint dedicado de detalhe de publicacao
- filtros de fila executados no backend
- painel de SLA por diario DJEN
- historico diario agregado de captura DJEN
- alerta automatico para diario DJEN com erro ou atrasado pelo SLA
- backfill global por periodo para descoberta de publicacoes e processos candidatos sem depender de planilha inicial
- criacao assistida de processo a partir de publicacao `SEM_VINCULO`, com pre-preenchimento por CNJ/DataJud e vinculacao automatica apos salvar
- backfill inicial automatico por fonte `NOME`/`OAB` logo apos cadastro da pesquisa monitorada
- historico de backfill DJEN por fonte monitorada, com status, periodo, lidas, importadas, falhas e mensagem
- status de captura recorrente DJEN por fonte monitorada, com ultima execucao, importadas, falhas e proxima execucao estimada pelo cron
- endpoint assincrono de backfill por fonte, com execucao `PENDENTE` e acompanhamento pela tela administrativa
- lock contra execucao concorrente
- auditoria detalhada de capturas
- tratamento operacional por tarefa, prazo, audiencia e descarte
- vinculo `publicacao -> evento_juridico -> prazo/tarefa/audiencia`
- exibicao das atividades criadas dentro da publicacao
- triagem automatica local com regras explicaveis para prazo, audiencia, providencia e urgencia
- geracao automatica de tarefa interna de triagem para publicacao capturada com responsavel

## O que ainda falta

### Homologacao real

- validar formatos reais retornados por DJEN/Comunica em ambiente de producao
- confirmar codigos de tribunal/caderno
- validar volume e tempo de execucao
- ajustar janela de lookback por rotina do escritorio

### Robustez de producao

- notificacao por canal externo opcional para incidentes criticos de captura
- dashboard historico de disponibilidade por diario e por tribunal

### Automacao avancada

- regras do escritorio para sugestao de prazo
- sugestao de responsavel por processo/cliente/equipe
- sugestao de tarefa padrao por tipo de publicacao
- calibracao da triagem com exemplos reais capturados em homologacao

### Integracoes futuras

- PJe/PDPJ com credenciais reais e escopo definido
- validacoes cruzadas com DataJud quando houver CNJ
- Domicilio Judicial permanece congelado ate decisao futura explicita

## Padrao para implementar novas fontes

Toda nova fonte deve seguir este contrato:

1. fonte tem configuracao isolada
2. coleta automatica fica desligada por padrao
3. existe endpoint de replay/suporte
4. existe auditoria de execucao
5. existe deduplicacao
6. existe lock se o job puder concorrer
7. nao ha ciencia/aceite automatico
8. dados importados entram em publicacao ou evento juridico
9. tratamento sempre gera historico

## Proximos passos recomendados

1. Homologar DJEN em ambiente real com alguns tribunais prioritarios.
2. Calibrar a triagem automatica com exemplos reais de publicacoes capturadas.
3. Adicionar retry/retomada para backfill por fonte.
4. Implementar alertas por fonte monitorada.
5. Implementar tratamento de publicacoes com IA assistiva.
6. Evoluir criacao assistida com sugestao estruturada de partes e cliente provavel.
7. Evoluir o historico para disponibilidade por diario/tribunal e comparativo de volume esperado.
8. Mapear PDPJ/PJe apenas depois de confirmar escopo e credenciais do escritorio.
