# Integracao Domicilio Judicial Eletronico (Read-only)

## Objetivo

Preparar o Juris Harmony para importar comunicacoes do Domicilio Judicial Eletronico para a Inbox Juridica sem automatizar qualquer ato que possa registrar ciencia ou iniciar prazo.

## Regras de negocio

- A integracao e exclusivamente `read-only`.
- O sistema pode listar metadados das comunicacoes e importa-los para a Inbox Juridica.
- O sistema nao deve abrir automaticamente o inteiro teor.
- O sistema nao deve consumir endpoints de aceite, ciencia ou abertura sensivel.
- A decisao de abrir a comunicacao no portal oficial continua humana.

## Variaveis de ambiente

- `DOMICILIO_ENABLED`
- `DOMICILIO_BASE_URL`
- `DOMICILIO_TOKEN_URL`
- `DOMICILIO_CLIENT_ID`
- `DOMICILIO_CLIENT_SECRET`
- `DOMICILIO_ON_BEHALF_OF`
- `DOMICILIO_TENANT_ID`
- `DOMICILIO_EU_PATH`
- `DOMICILIO_COMUNICACOES_PATH`
- `DOMICILIO_SYNC_CRON`

## Fluxo implementado

1. Obtem token OAuth via `client_credentials`.
2. Resolve `tenantId` por configuracao direta ou via endpoint `eu`.
3. Consulta comunicacoes por periodo e/ou numero do processo.
4. Importa as comunicacoes como `eventos_juridicos` da fonte `DOMICILIO`.
5. Vincula ao processo local quando o numero CNJ existir no banco.
6. Notifica os responsaveis apenas para triagem na inbox.

## Endpoint manual

- `POST /api/eventos-juridicos/sincronizar-domicilio`

Parametros opcionais:

- `dataInicio`
- `dataFim`
- `numeroProcesso`

## Scheduler

- Job configuravel por `DOMICILIO_SYNC_CRON`
- Execucao padrao a cada 2 horas
- Roda somente quando `DOMICILIO_ENABLED=true`

## Limites atuais

- A ativacao depende de credenciais institucionais validas do escritorio.
- O parser foi desenhado para resposta JSON flexivel, mas precisa ser validado contra a resposta real do ambiente do escritorio.
- A UI ja possui configuracao administrativa, teste de conexao read-only e botao de sincronizacao manual na Inbox Juridica.
- O sistema nao consome inteiro teor nem registra ciencia; ele apenas importa metadados para triagem.
- Quando houver correspondencia com partes e representantes internos do processo, a inbox pode sugerir um responsavel automaticamente.
