# Apresentacao executiva das integracoes juridicas

Data: 14/04/2026

## 1. Objetivo

Este documento resume, para avaliacao interna do escritorio, o estado atual das integracoes juridicas do Juris Harmony, o que ja esta operacional, o que ainda falta e quais credenciais sao necessarias.

## 2. Resumo executivo

O Juris Harmony esta sendo estruturado para operar com tres frentes complementares:

- `Datajud` para capa processual e movimentacoes publicas
- `Domicilio Judicial Eletronico` para comunicacoes institucionais, citacoes e intimacoes pessoais
- `DJEN / Jus.br`, no futuro, para publicacoes e intimacoes de advogado

O sistema segue uma regra critica: `nao automatizar ciencia, aceite ou abertura sensivel que possa iniciar prazo`.

## 3. O que ja esta pronto

### Datajud

- consulta por numero CNJ
- importacao de capa processual
- importacao de movimentacoes publicas
- sincronizacao automatica periodica
- reprocessamento manual
- notificacoes internas para os responsaveis

### Domicilio Judicial Eletronico

- autenticacao do backend por `client_credentials`
- resolucao de `tenantId`
- uso de `On-behalf-Of`
- tela administrativa de configuracao
- teste de conexao
- sincronizacao manual e automatica
- importacao para a Inbox Juridica em modo `read-only`

### Operacao interna

- Inbox Juridica
- distribuicao por processo, parte, nome, OAB e CPF
- criacao de tarefas e prazos internos
- notificacoes internas para triagem

## 4. O que ainda falta

- credenciais reais do `Domicilio Judicial Eletronico`
- definicao do operador institucional principal e reserva
- preenchimento consistente de `CPF` e `OAB` dos advogados
- confirmacao do caminho oficial de automacao do `DJEN / Jus.br`
- homologacao final no ambiente real do escritorio

## 5. Quais credenciais precisamos

### Do time tecnico

- `DATAJUD_API_KEY`
- `api.datajud.base-url`

### Do escritorio

- `DOMICILIO_CLIENT_ID`
- `DOMICILIO_CLIENT_SECRET`
- confirmacao do `tenantId`
- definicao do operador institucional

### Dos advogados

- `CPF`
- `OAB`
- `email`
- unidade

## 6. Regras de seguranca juridica

- sem ciencia automatica
- sem aceite automatico
- sem abertura automatica de inteiro teor sensivel
- com triagem humana para comunicacoes criticas
- com rastreabilidade da origem do evento

## 7. Resultado esperado

Com as credenciais corretas e o cadastro interno ajustado, o escritorio passa a ter:

- atualizacao automatica de andamentos publicos
- inbox centralizada de comunicacoes
- notificacao mais precisa ao advogado correto
- menos dependencia de consulta manual em varios portais
- menor risco operacional

## 8. Documentos de apoio

- [matriz-credenciais-integracoes-juridicas-2026-04-14.md](/C:/Users/vitor/Projetos%20Javinha/viana/juris-harmony-48/docs/matriz-credenciais-integracoes-juridicas-2026-04-14.md)
- [domicilio-read-only.md](/C:/Users/vitor/Projetos%20Javinha/viana/juris-harmony-48/docs/domicilio-read-only.md)
- [roadmap-integracoes-juridicas.md](/C:/Users/vitor/Projetos%20Javinha/viana/juris-harmony-48/docs/roadmap-integracoes-juridicas.md)
