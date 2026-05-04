# Fluxo de referencia do Astrea para escritorio de advocacia

Data: 14/04/2026

Atualizacao de escopo em 04/05/2026: este documento continua como referencia comparativa do Astrea. O plano ativo atual esta no checklist `docs/checklist-publicacoes-automatizadas.md`; Domicilio Judicial Eletronico esta congelado e tratamento de publicacoes com IA assistiva entrou no roadmap.

## Objetivo

Este documento traduz o checklist de planos e precos do Astrea para uma visao de fluxo de produto. A ideia nao e copiar tela por tela, mas entender como o software organiza a operacao de um escritorio de advocacia e quais modulos precisam existir para entregar valor equivalente.

## Leitura executiva

O Astrea nao e apenas um cadastro de processos. Ele funciona como um sistema operacional do escritorio juridico, com cinco linhas principais:

- base operacional do escritorio
- acompanhamento de processos e publicacoes
- execucao interna por tarefas, prazos e equipe
- relacionamento com cliente
- gestao administrativa e indicadores

Na pratica, o fluxo central e:

1. cadastrar estrutura do escritorio
2. cadastrar clientes e processos
3. monitorar processos, publicacoes e intimacoes
4. transformar eventos em triagem, tarefas e prazos
5. executar trabalho juridico e administrativo
6. prestar retorno ao cliente
7. medir produtividade, carteira e resultado

## Entidades centrais do produto

Para o fluxo funcionar, o produto precisa girar em torno destas entidades:

- escritorio/unidade
- usuario
- perfil/permissao
- cliente
- atendimento
- processo/caso
- parte e representante
- publicacao/intimacao/movimentacao
- prazo
- tarefa/evento
- documento/modelo
- contrato/honorario/cobranca
- indicador

Sem essas entidades bem ligadas, o software vira um conjunto de telas soltas.

## Fluxo funcional do Astrea

### 1. Onboarding do escritorio

Fluxo esperado:

1. cadastrar o escritorio e unidades
2. criar usuarios
3. definir papeis e permissoes
4. configurar nomes para captura de publicacoes e intimacoes
5. configurar espaco em nuvem e parametros gerais

O checklist de planos indica que a oferta comercial do Astrea comeca limitando recursos base:

- quantidade de processos/casos cadastrados
- quantidade de processos monitorados
- quantidade de usuarios
- quantidade de nomes monitorados para captura
- capacidade de armazenamento

Isso mostra que o produto e vendido em cima de capacidade operacional, nao apenas de funcionalidades.

### 2. Entrada de trabalho juridico

Fluxo esperado:

1. cadastrar cliente
2. registrar atendimento inicial
3. abrir processo ou caso
4. associar partes, polos, representantes e responsaveis internos
5. anexar documentos e informacoes financeiras do caso

Aqui nasce a unidade de trabalho principal: o processo/caso. A maior parte do restante do sistema existe para alimentar, organizar ou operar esse objeto.

### 3. Monitoramento juridico

Fluxo esperado:

1. vincular processos a monitoramento
2. capturar publicacoes, intimacoes e andamentos
3. classificar relevancia
4. centralizar historico do caso
5. alertar a equipe responsavel

Pelo checklist, esse e um dos motores do produto. O Astrea combina:

- processos monitorados
- captura por nomes
- classificacao automatica de andamentos importantes
- tratamento de publicacoes com IA

Ou seja: a promessa nao e so armazenar processo, mas reduzir consulta manual e organizar triagem.

### 4. Triagem operacional

Fluxo esperado:

1. novo evento entra na fila
2. evento e vinculado ao processo correto
3. responsavel interno e definido
4. evento recebe classificacao
5. evento vira prazo, tarefa, audiencia ou apenas registro

Esse e o ponto em que o software deixa de ser apenas "acompanhamento" e vira "operacao".

O Astrea sugere que a triagem se apoia em:

- calculadora de prazos
- classificacao automatica
- centralizacao de atividades dentro de prazos e audiencias
- tarefas e eventos
- etiquetas
- comentarios e mencoes

Em produto, isso significa que a inbox juridica e so a porta de entrada. O valor real esta na conversao do evento em trabalho rastreavel.

### 5. Execucao da equipe

Fluxo esperado:

1. distribuir tarefas entre advogados e apoio
2. acompanhar execucao por lista, agenda e kanban
3. registrar comentarios internos
4. reutilizar atividades predefinidas
5. produzir pecas e documentos

O checklist mostra uma operacao interna forte:

- gestao kanban
- filtro de atividades por equipe
- grafico de atividades por equipe
- atividades predefinidas
- criacao de modelos de documentos
- geracao de pecas juridicas com IA

Isso indica que o Astrea tenta ficar no meio do caminho entre software juridico e software de produtividade da equipe.

### 6. Atendimento e comunicacao com cliente

Fluxo esperado:

1. registrar atendimentos
2. manter historico do relacionamento
3. abrir acesso externo ao cliente
4. enviar atualizacoes de andamento em linguagem mais clara

O checklist deixa claro que o produto possui uma camada externa:

- cadastro de atendimentos aos clientes
- acesso personalizado para clientes
- aplicativo Portal do Cliente
- envio de andamentos traduzidos por IA

Isso muda o desenho do sistema, porque parte da informacao precisa sair do backoffice e virar experiencia segura para o cliente final.

### 7. Gestao administrativa do escritorio

Fluxo esperado:

1. registrar honorarios e custos
2. acompanhar financeiro do processo e do escritorio
3. emitir cobrancas
4. controlar horas e produtividade
5. controlar acesso por usuario

O checklist cobre:

- controle financeiro por processo
- gestao financeira
- emissao de boletos com pix e regua de cobranca
- cronometro e timesheet
- ajuste de permissoes por usuario
- app para celular

Aqui o Astrea deixa de ser apenas software processual e entra no ERP leve do escritorio.

### 8. Indicadores e decisao

Fluxo esperado:

1. consolidar dados operacionais
2. medir carteira, produtividade e volume
3. segmentar por cliente, processo e time
4. apoiar decisao gerencial

Os indicadores listados mostram tres niveis:

- pessoal
- operacional de processos
- relacao processo x cliente
- estrategico

Entao o sistema precisa guardar historico e nao apenas estado atual.

## Logica de planos e precos inferida do checklist

O checklist de planos e precos indica uma estrutura comercial baseada em duas camadas:

### 1. Limites de capacidade

- processos/casos
- processos monitorados
- usuarios
- nomes monitorados
- armazenamento

### 2. Liberacao de sofisticacao

- IA juridica
- portal do cliente
- kanban
- financeiro avancado
- cobranca
- indicadores
- timesheet

Em outras palavras: planos menores resolvem controle basico e monitoramento; planos maiores resolvem escala, automacao, cliente externo e gestao do escritorio.

## Comparacao com o estado atual do Juris Harmony

Analise feita a partir do codigo do frontend, backend e docs internos do projeto.

### Ja existe no projeto

- cadastro e listagem de processos
- detalhes do processo com partes, representantes, etiquetas, movimentacoes e documentos
- sincronizacao Datajud
- inbox juridica para eventos
- vinculacao de evento ao processo
- atribuicao de responsavel
- criacao manual de prazo a partir do evento
- calculadora de prazo
- gestao de prazos e tarefas
- quadro kanban para tarefas internas
- cadastro e listagem de clientes
- acervo de documentos por cliente, processo e pastas internas
- configuracao de usuarios e papeis
- logs de auditoria
- base de integracao com Domicilio, congelada fora do plano ativo atual
- dashboard com contadores operacionais

### Existe parcialmente

- controle financeiro por processo
  O frontend possui `FinanceiroView`, mas nao esta integrado ao fluxo principal e parece operar com `mockData`.
- indicadores
  Ha dashboard operacional, mas nao um modulo completo de indicadores pessoais, por cliente e estrategicos.
- permissoes
  Existem papeis e controles basicos, mas nao uma matriz detalhada de permissoes por funcionalidade.
- classificacao automatica
  O projeto ja faz triagem e organizacao, mas a classificacao automatica tipo Astrea ainda nao aparece como recurso maduro de produto.
- centralizacao de atividades por equipe
  Ja existe tarefa, prazo, kanban e unidade; falta aprofundar visoes gerenciais por equipe.

### Nao aparece implementado no estado atual

- cadastro de atendimentos aos clientes
- portal do cliente
- aplicativo mobile do cliente ou do escritorio
- envio de andamentos traduzidos por IA
- geracao de pecas juridicas com IA
- tratamento de publicacoes com IA
- nomes para captura de publicacoes como modulo comercial explicito
- boletos, pix e regua de cobranca
- cronometro e timesheet
- modelos de documentos como biblioteca estruturada
- graficos de atividades por equipe
- indicadores estrategicos completos

## Fluxo-alvo recomendado para aproximar do Astrea

Se o objetivo for aproximar o Juris Harmony do fluxo do Astrea, a sequencia mais coerente e:

### Fase 1. Consolidar o nucleo operacional

- processos
- inbox juridica
- vinculo evento -> processo
- atribuicao
- prazo/tarefa
- calendario
- kanban
- documentos

Essa fase ja esta majoritariamente presente.

### Fase 2. Fechar lacunas de escritorio

- financeiro real no backend
- honorarios por processo
- custos por processo
- indicadores operacionais por equipe
- permissoes mais finas

### Fase 3. Fechar lacunas de relacionamento com cliente

- atendimentos
- historico de interacoes
- portal do cliente
- atualizacoes simplificadas de andamento

### Fase 4. Camada de sofisticacao

- IA para triagem e resumo
- IA para traducao de andamento
- IA para minuta e pecas
- automacoes comerciais por plano

## Resumo pratico

O fluxo do Astrea pode ser resumido assim:

- captar informacao juridica
- organizar por processo
- transformar em trabalho interno
- executar com controle
- reportar ao cliente
- medir o escritorio

O Juris Harmony atual ja cobre boa parte do miolo juridico-operacional. O que ainda distancia o produto do Astrea e menos a area de processo em si e mais as camadas de:

- atendimento ao cliente
- financeiro operacional real
- automacoes e IA
- indicadores gerenciais
- produto externo para cliente final

## Atualizacao do modulo de publicacoes

O Juris Harmony passou a tratar a publicacao como origem operacional rastreavel. A publicacao capturada pode gerar tarefa, prazo ou audiencia sem trocar de tela. O backend cria ou reutiliza um evento juridico de origem `PUBLICACAO`, cria a atividade em `prazos`, marca a publicacao como tratada e retorna a lista de `atividadesVinculadas`.

Essa evolucao aproxima o fluxo do comportamento esperado em um sistema tipo Astrea: a captura nao fica parada como alerta; ela vira trabalho atribuido, com historico e responsavel.

Documento tecnico complementar:

- `docs/publicacoes-sistema-completo.md`

## Referencias internas consultadas

- `docs/roadmap-integracoes-juridicas.md`
- `docs/apresentacao-executiva-integracoes-juridicas-2026-04-14.md`
- `frontend/src/pages/Index.tsx`
- `frontend/src/components/views/ProcessosView.tsx`
- `frontend/src/components/views/InboxJuridicaView.tsx`
- `frontend/src/components/views/PrazosView.tsx`
- `frontend/src/components/views/ClientesView.tsx`
- `frontend/src/components/views/DocumentosView.tsx`
- `frontend/src/components/views/ConfiguracoesView.tsx`
- `frontend/src/components/views/FinanceiroView.tsx`
- `frontend/src/services/api.ts`
- `backend/src/main/java/com/viana/controller`
- `backend/src/main/java/com/viana/service`
- `backend/src/main/resources/db/migration`
