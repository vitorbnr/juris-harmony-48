# Implementacao - Captura Comunica/DJEN + DataJud

Data: 30/04/2026

Checklist ativo: `docs/checklist-publicacoes-automatizadas.md`

## Objetivo

Construir uma esteira automatizada de publicacoes judiciais com o menor custo operacional possivel, usando fontes oficiais e evitando scraping como caminho padrao.

O fluxo alvo e:

1. cadastrar fontes monitoradas do escritorio: nome, OAB, CPF ou CNPJ
2. buscar publicacoes no Comunica/DJEN por OAB/nome de forma global por data
3. deduplicar e importar somente o que pertence ao escritorio
4. extrair numero CNJ quando existir
5. vincular ao processo ja cadastrado
6. enriquecer o processo com DataJud em rotina propria
7. gerar tarefa de triagem segura para o responsavel
8. tratar a publicacao com IA assistiva, sem acao juridica automatica definitiva
9. alertar falhas, atrasos e publicacoes novas

## Descoberta da carteira sem planilha

Nao vamos tratar planilha como caminho obrigatorio.

Quando o escritorio nao tem uma base inicial organizada, o fluxo passa a ser:

1. cadastrar o advogado/fonte monitorada com nome, OAB e UF
2. executar backfill DJEN/Comunica por janelas de data
3. importar as publicacoes encontradas para a fila de Publicacoes
4. extrair CNJs das publicacoes capturadas
5. vincular automaticamente apenas quando o processo ja existir
6. manter publicacoes com CNJ desconhecido em `SEM_VINCULO`
7. permitir conferencia humana para criar/vincular o processo correto
8. apos o processo existir, sincronizar DataJud para capa e movimentacoes publicas

Isso substitui a necessidade de subir todos os processos na unha como primeiro passo. A tela de Publicacoes vira a fila de descoberta e saneamento da carteira.

Implementacao atual da criacao assistida:

```http
POST /api/publicacoes/{publicacaoId}/processo
```

Esse endpoint recebe o mesmo payload de criacao normal de processo, valida que a publicacao ainda nao esta vinculada, confere o CNJ capturado quando existir, cria o processo e vincula a publicacao na mesma operacao transacional. A tela de Publicacoes abre o cadastro de processo pre-preenchido com o CNJ, consulta DataJud automaticamente quando o numero e valido, e exige confirmacao de cliente, unidade e responsaveis antes de salvar.

Limite importante: esse metodo descobre processos que tiveram comunicacao/publicacao no periodo pesquisado e que vieram pelo DJEN/Comunica. Ele nao garante 100% da carteira historica se o processo nao teve publicacao no periodo, se estiver em segredo, se depender de painel autenticado, ou se a comunicacao existir apenas em PJe/e-SAJ/Projudi/eproc autenticado. Para cobertura total equivalente a softwares comerciais, o proximo nivel e integrar paineis autenticados ou contratar base externa, mas isso fica fora do MVP oficial de baixo custo.

## Premissas

- O Comunica/DJEN e a fonte principal para publicacoes judiciais destinadas a advogados.
- O DataJud nao substitui o DJEN. Ele complementa com capa e movimentacoes publicas do processo.
- O Domicilio Judicial Eletronico esta congelado fora do plano ativo atual.
- DOU/INLABS nao faz parte do core de publicacoes judiciais.
- Diarios administrativos, municipais, executivos, legislativos, MP, defensoria, TCs, OAB, INPI, CVM e BCB ficam fora do MVP automatico.
- IA entra como apoio ao tratamento de publicacoes, sempre assistiva e auditavel.

## Cobertura oficial considerada

Segundo a pagina de Comunicacoes Processuais do CNJ, o DJEN e instrumento de publicacao dos atos judiciais do Poder Judiciario e substitui os diarios de justica eletronicos mantidos pelos orgaos do Judiciario.

Fonte: https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/

O Swagger oficial do Comunica/DJEN expõe:

- `GET /api/v1/comunicacao`
- `GET /api/v1/comunicacao/tribunal`
- `GET /api/v1/comunicacao/{hash}/certidao`
- `GET /api/v1/caderno/{sigla_tribunal}/{data}/{meio}`

Fonte: https://comunicaapi.pje.jus.br/swagger/index.html

Em consulta feita em 30/04/2026 ao endpoint publico `GET /api/v1/comunicacao/tribunal`, a API retornou 115 registros e 89 siglas unicas, incluindo TJs, TRFs, TRTs e tribunais superiores. Isso indica alta cobertura judicial, mas nao cobertura de todos os diarios oficiais administrativos do pais.

## Decisao de arquitetura

O coletor passa a usar duas estrategias:

### 1. Busca direta por comunicacao

Fonte primaria.

Endpoint:

```http
GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
```

Parametros usados:

- `dataDisponibilizacaoInicio`
- `dataDisponibilizacaoFim`
- `meio=D`
- `numeroOab`
- `ufOab`
- `nomeAdvogado`
- `pagina`
- `itensPorPagina`

Uso:

- fontes do tipo `OAB` pesquisam por `numeroOab` e `ufOab`
- fontes do tipo `NOME` pesquisam por `nomeAdvogado`
- a coleta recorrente nao precisa consultar tribunal por tribunal
- `siglaTribunal` e usado apenas em replay/auditoria/fallback especifico
- resultados ainda passam pelo filtro local para evitar falso positivo
- publicacoes duplicadas entre nome e OAB sao agregadas antes da ingestao

### 2. Caderno DJEN

Fonte de fallback e auditoria.

Endpoint:

```http
GET https://comunicaapi.pje.jus.br/api/v1/caderno/{sigla_tribunal}/{data}/{meio}
```

Uso:

- quando a busca direta falha
- quando existem fontes `CPF` ou `CNPJ`, que nao sao cobertas pela busca direta atual
- opcionalmente quando a busca direta volta vazia, via configuracao
- para replay de suporte por tribunal/data

## Configuracoes

```env
DJEN_SYNC_ENABLED=false
DJEN_SYNC_CRON=0 30 6 * * *
DJEN_SYNC_LOOKBACK_DAYS=3
DJEN_TRIBUNAIS=
DJEN_CADERNO_TIPO=D
DJEN_API_BASE_URL=https://comunicaapi.pje.jus.br/api/v1
DJEN_USER_AGENT=JurisHarmonyPublicacoes/1.0
DJEN_TIMEOUT_SECONDS=60
DJEN_RETRY_ATTEMPTS=3
DJEN_RETRY_BACKOFF_MS=1500
DJEN_COMUNICACAO_ENABLED=true
DJEN_COMUNICACAO_PAGE_SIZE=100
DJEN_COMUNICACAO_MAX_PAGES=100
DJEN_CADERNO_FALLBACK_ENABLED=true
DJEN_CADERNO_FALLBACK_ON_EMPTY=false
DJEN_SYNC_LOCK_TTL_MINUTES=60
DJEN_BACKFILL_MAX_DAYS=31
DJEN_SYNC_SLA_HOURS=36
DJEN_SYNC_HISTORY_DAYS=14
```

## Como funciona no codigo

### Cliente de busca direta

Arquivo:

- `backend/src/main/java/com/viana/service/DjenComunicacaoClientService.java`

Responsabilidades:

- montar URL para `/api/v1/comunicacao`
- paginar resultados com `itensPorPagina=100`
- respeitar timeout, retry e backoff
- converter itens da API para `DjenPublicacaoCapturada`
- preservar `texto`, `numero_processo`, `siglaTribunal`, `hash`, `id` e data de disponibilizacao

### Orquestrador da coleta

Arquivo:

- `backend/src/main/java/com/viana/service/PublicacaoDjenColetaService.java`

Responsabilidades:

- carregar fontes monitoradas ativas
- resolver tribunais monitorados
- executar busca direta quando habilitada
- cair para caderno quando necessario
- filtrar resultados localmente por nome/OAB/CPF/CNPJ
- deduplicar por hash
- importar publicacao
- definir destinatarios internos
- registrar execucao e falha

### DataJud

Arquivos principais:

- `backend/src/main/java/com/viana/service/DatajudClientService.java`
- `backend/src/main/java/com/viana/service/ProcessoService.java`
- `backend/src/main/java/com/viana/service/DatajudSyncScheduler.java`

Responsabilidades:

- sincronizar processos ativos com numero CNJ
- atualizar movimentacoes publicas
- registrar estado da integracao
- notificar responsaveis quando houver movimentacoes novas

## Guardrails

- Nao ha ciencia automatica.
- Domicilio Judicial Eletronico esta congelado; se for retomado no futuro, nao podera haver abertura automatica de comunicacao sensivel.
- Nao ha criacao automatica de prazo fatal definitivo.
- A ingestao pode criar tarefa interna de triagem.
- Toda publicacao importada deve manter hash de deduplicacao e origem.
- Falhas de coleta devem ficar visiveis no painel administrativo.
- IA pode resumir, classificar e sugerir a acao, mas a confirmacao juridica continua humana.

## Plano de homologacao

1. Cadastrar 1 ou 2 OABs reais do escritorio.
2. Configurar tribunais prioritarios em `DJEN_TRIBUNAIS` ou selecionar diarios DJEN na fonte monitorada.
3. Rodar replay manual:

```http
POST /api/publicacoes/coleta/djen?data=2026-04-30
```

Replay por tribunal continua possivel quando a auditoria precisar restringir a origem:

```http
POST /api/publicacoes/coleta/djen?tribunal=TJSP&data=2026-04-30
```

Backfill por periodo para descobrir publicacoes/processos candidatos:

```http
POST /api/publicacoes/coleta/djen?dataInicio=2026-04-01&dataFim=2026-04-30
```

Por padrao, o backfill fica limitado por `DJEN_BACKFILL_MAX_DAYS=31` por execucao para evitar abuso da API publica, estouro de rate limit e execucoes longas demais. Para historico maior, rodar em janelas mensais.

Backfill inicial por uma pesquisa monitorada especifica:

```http
POST /api/publicacoes/fontes-monitoradas/{fonteId}/backfill-djen?dataInicio=2026-04-01&dataFim=2026-04-30
```

Esse caminho e usado pela interface logo apos cadastrar uma nova fonte `NOME` ou `OAB`. Ele pesquisa somente aquela fonte, sem cair para caderno por tribunal, para evitar uma varredura pesada e imprecisa em CPF/CNPJ. O objetivo e trazer rapidamente publicacoes recentes e processos candidatos sem depender de planilha.

A interface administrativa usa o modo assincrono para nao travar a tela durante a coleta:

```http
POST /api/publicacoes/fontes-monitoradas/{fonteId}/backfill-djen/async?dataInicio=2026-04-01&dataFim=2026-04-30
```

Esse endpoint cria uma execucao `PENDENTE` em `publicacoes_fontes_sync_execucoes`, executa o backfill em background e permite acompanhar status, periodo, lidas, importadas e falhas na propria linha da fonte monitorada.

4. Conferir:

- publicacoes lidas
- publicacoes importadas
- captada em nome de quem
- OAB monitorada
- processo vinculado por CNJ
- publicacoes `SEM_VINCULO`, que representam candidatos de processo a conferir/criar
- tarefa de triagem criada
- notificacao interna

5. Ativar scheduler:

```env
DJEN_SYNC_ENABLED=true
```

6. Acompanhar SLA por pelo menos 7 dias uteis.

## Pendencias

- Enriquecimento automatico de sugestao de partes a partir do texto da publicacao/DataJud.
- Contrato e servico de IA assistiva para resumo, classificacao, prazo, responsavel e acao sugerida.
- Mapa automatico de siglas legadas do catalogo Astrea para siglas oficiais do Comunica.
- Sincronizacao periodica do endpoint `/api/v1/comunicacao/tribunal` para medir cobertura e atraso por tribunal.
- Homologacao com dados reais do escritorio.
- Domicilio Judicial Eletronico congelado fora do plano ativo.
- PJe/PDPJ autenticado somente apos confirmacao de escopo e credenciais.
