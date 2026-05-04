# Cobertura de Siglas - Publicacoes

Data: 30/04/2026

## Resumo

Esta matriz compara o catalogo tipo Astrea carregado no projeto com a cobertura publica atual do Comunica/DJEN.

Resultado operacional:

- Para publicacoes judiciais por OAB/nome, o Comunica/DJEN deve ser a fonte principal.
- Para movimentacoes e capa de processos, DataJud complementa o DJEN.
- Domicilio Judicial Eletronico fica congelado fora do plano ativo neste momento.
- Para intimacoes pessoais/institucionais fora do DJEN, paineis autenticados entram apenas em fase futura.
- Para diarios administrativos fora do Judiciario, teremos perda em relacao ao catalogo amplo do Astrea se nao implementarmos conectores especificos.

## Comunica/DJEN oficial consultado

Endpoint:

```http
GET https://comunicaapi.pje.jus.br/api/v1/comunicacao/tribunal
```

Retorno em 30/04/2026:

- 115 registros
- 89 siglas unicas

### Superiores e nacionais

```txt
CJF, CNJ, PJeCor, SEEU, STJ, STM, TSE, TST
```

### Tribunais de Justica

```txt
TJAC, TJAL, TJAM, TJAP, TJBA, TJCE, TJDFT, TJES, TJGO, TJMA, TJMG,
TJMMG, TJMRS, TJMS, TJMSP, TJMT, TJPA, TJPB, TJPE, TJPI, TJPR,
TJRJ, TJRN, TJRO, TJRR, TJRS, TJSC, TJSE, TJSP, TJTO
```

### Tribunais Regionais Federais

```txt
TRF1, TRF2, TRF3, TRF4, TRF5, TRF6
```

### Tribunais Regionais do Trabalho

```txt
TRT1, TRT2, TRT3, TRT4, TRT5, TRT6, TRT7, TRT8, TRT9, TRT10, TRT11,
TRT12, TRT13, TRT14, TRT15, TRT16, TRT17, TRT18, TRT19, TRT20,
TRT21, TRT22, TRT23, TRT24
```

### Tribunais Regionais Eleitorais retornados

```txt
TRE-AC, TRE-AL, TRE-AM, TRE-AP, TRE-BA, TRE-ES, TRE-GO, TRE-MA,
TRE-MS, TRE-MT, TRE-PA, TRE-PE, TRE-PI, TRE-PR, TRE-RJ, TRE-RN,
TRE-RO, TRE-RS, TRE-SC, TRE-SP, TRE-TO
```

## Leitura das siglas do catalogo Astrea

O catalogo local tem 482 codigos unicos. Muitos sao aliases legados por estado, caderno, PJe, administrativo ou DJN.

### Justica estadual/TJM - DJEN provavel

O que faz: publicacoes judiciais estaduais. Deve ser coberto pelo Comunica/DJEN quando mapeado para `TJxx` ou `TJMxx`.

```txt
TJAC, TJACDJN, TJAL, TJALDJN, TJAM, TJAMDJN, TJAP, TJAPDJN, TJBA,
TJBADJN, TJCEADM, TJCEDJN, TJDFADM, TJDFDJN, TJES, TJESDJN,
TJESPJEN, TJGO, TJGODJN, TJGOIMG, TJMA, TJMADJN, TJMG, TJMGA,
TJMGDJN, TJMGE, TJMMGDJN, TJMRSDJN, TJMS, TJMSDJN, TJMT, TJMTADM,
TJMTDJN, TJPA, TJPADJN, TJPB, TJPBDJN, TJPE, TJPEDJN, TJPEPJE,
TJPI, TJPIDJN, TJPR, TJPRDJN, TJRJ, TJRJDJN, TJRN, TJRNDJN,
TJRO, TJRODJN, TJRR, TJRRDJN, TJRS, TJRSDJN, TJSC, TJSCDJN,
TJSE, TJSEDJN, TJSP, TJSP2, TJSPDJN, TJTO, TJTODJN
```

Perda esperada: baixa para publicacao judicial por advogado. Pode haver lacuna em cadernos administrativos ou sistemas internos que nao publiquem no DJEN.

### Justica Federal/TRF - DJEN provavel

O que faz: publicacoes judiciais federais por secao/subsecao ou TRF. Deve ser coberto por `TRF1` a `TRF6` no Comunica/DJEN.

```txt
JFACDJN, JFAL, JFALADM, JFALDJN, JFALPJE, JFAMDJN, JFAPDJN,
JFBADJN, JFCE, JFCEADM, JFCEDJN, JFCEPJE, JFDFDJN, JFESADM,
JFESDJN, JFGODJN, JFMADJN, JFMGDJN, JFMGDJN6, JFMS, JFMSDJN,
JFMTDJN, JFPADJN, JFPB, JFPBADM, JFPBDJN, JFPBPJE, JFPE,
JFPEADM, JFPEDJN, JFPEPJE, JFPIDJN, JFPR, JFPRDJN, JFRJADM,
JFRJDJN, JFRN, JFRNADM, JFRNDJN, JFRNPJE, JFRODJN, JFRRDJN,
JFRS, JFRSDJN, JFSC, JFSCDJN, JFSE, JFSEADM, JFSEDJN, JFSEPJE,
JFSP, JFSPDJN, JFTODJN
```

Perda esperada: baixa para publicacao judicial. Alguns codigos `ADM`/`PJE` sao administrativos ou paineis e podem exigir fallback autenticado.

### TRF direto - DJEN oficial/provavel

O que faz: comunicacoes federais regionais, pautas, atas e PJe/ADM em alguns casos.

```txt
TRF1ATA, TRF1ATAS, TRF1DJN, TRF1PAUTAS, TRF1PJE, TRF2ADM, TRF2DJN,
TRF3, TRF3DJN, TRF3PAUTA, TRF4, TRF4DJN, TRF5, TRF5ADM, TRF5DJN,
TRF5PJE, TRF6ADM, TRF6DJN
```

Perda esperada: baixa para comunicacoes judiciais; media para pautas/atas/administrativo se forem publicadas fora do fluxo de comunicacao por OAB.

### Justica do Trabalho/TRT - DJEN provavel

O que faz: publicacoes trabalhistas. O Comunica retorna `TRT1` a `TRT24`; aliases estaduais do Astrea precisam ser normalizados para regioes TRT.

```txt
TRAC, TRACADM, TRACDJN, TRAL, TRALADM, TRALDJN, TRAMADM, TRAMN,
TRAMNDJN, TRAP, TRAPADM, TRAPDJN, TRBA, TRBAADMN, TRBADJN, TRCE,
TRCEADM, TRCEDJN, TRDF, TRDFADM, TRDFDJN, TRES, TRESADM, TRESDJN,
TRGO, TRGOADM, TRGODJN, TRMA, TRMAADM, TRMADJN, TRMG, TRMGADM,
TRMGDJN, TRMS, TRMSADM, TRMSDJN, TRMT, TRMTADM, TRMTDJN, TRPA,
TRPAADM, TRPADJN, TRPB, TRPBADM, TRPBDJN, TRPE, TRPEADM, TRPEDJN,
TRPI, TRPIADM, TRPIDJN, TRPR, TRPRADM, TRPRDJN, TRRJADM, TRRJN,
TRRJNDJN, TRRN, TRRNADM, TRRNDJN, TRRO, TRROADM, TRRODJN,
TRRRADM, TRRRN, TRRRNDJN, TRRS, TRRSADM, TRRSDJN, TRSCADM,
TRSCN, TRSCNDJN, TRSE, TRSEADM, TRSEDJN, TRSP, TRSPADM, TRSPDJN,
TRSPN, TRSPNADM, TRSPNDJN, TRTO, TRTOADM, TRTODJN
```

Perda esperada: baixa para publicacao judicial. Necessario normalizar alias estadual para `TRTn`.

### Justica Eleitoral - DJEN parcial

O que faz: publicacoes eleitorais. O Comunica retornou 21 TREs em 30/04/2026, nao todos os 27.

```txt
TEAC, TEACDJN, TEACME, TEAL, TEALDJN, TEALME, TEAM, TEAMDJN,
TEAMME, TEAP, TEAPDJN, TEAPME, TEBA, TEBADJN, TEBAME, TECE,
TECEDJN, TECEME, TEDF, TEDFDJN, TEDFME, TEES, TEESDJN, TEESME,
TEGO, TEGODJN, TEGOME, TEMA, TEMADJN, TEMAME, TEMG, TEMGDJN,
TEMGME, TEMS, TEMSDJN, TEMSME, TEMT, TEMTDJN, TEMTME, TEPA,
TEPADJN, TEPAME, TEPB, TEPBME, TEPE, TEPEDJN, TEPEME, TEPI,
TEPIDJN, TEPIME, TEPR, TEPRDJN, TEPRME, TERJ, TERJDJN, TERJME,
TERN, TERNDJN, TERNME, TERO, TERODJN, TEROME, TERR, TERRME,
TERS, TERSDJN, TERSME, TESC, TESCDJN, TESCME, TESE, TESEDJN,
TESEME, TESP, TESPDJN, TESPME, TETO, TETODJN, TETOME, TSE,
TSEDJN, TSEME
```

Perda esperada: media em eleitoral. TREs ausentes no retorno oficial precisam ser tratados como fallback por caderno, painel oficial ou revisao de disponibilidade.

### Superiores/Nacionais - DJEN provavel

O que faz: tribunais superiores, conselhos e orgaos nacionais do Judiciario.

```txt
CJFDJN, CNJ, CNJDJN, CORDJN, CSJT, CSJTADM, SEEUDJN, STFDJE, STJ,
STJDJN, STM, STMDJN, TST, TSTADM, TSTDJN
```

Perda esperada: baixa para `STJ`, `STM`, `TST`, `TSE`, `CNJ`, `CJF`, `SEEU`; incerta para aliases administrativos.

## Fora do DJEN

### Diarios Oficiais estaduais/municipais

O que fazem: atos do Executivo, municipios, publicacoes administrativas, editais, portarias, licitacoes, nomeacoes e atos nao necessariamente judiciais.

```txt
DOAC, DOAM, DOAP, DOCE, DODF, DOEBA, DOES, DOGO, DOMAL, DOMAM,
DOMBA, DOMCE, DOMFGO, DOMGO, DOMMA, DOMMG, DOMMGN, DOMMS, DOMPA,
DOMPB, DOMPE, DOMPR, DOMRJ, DOMRN, DOMRO, DOMRR, DOMRS, DOMS,
DOMSC, DOMSP, DOMSP2, DOMT, DOPA, DOPB, DOPI, DORN, DORO, DORR,
DORS, DOSC, DOSE, DOTO
```

Perda para o nosso produto: baixa se o foco for publicacoes judiciais por OAB/nome. Alta se o escritorio quiser monitorar licitacoes, atos administrativos, nomeacoes, editais extrajudiciais ou publicacoes municipais.

### Diarios municipais/setoriais

O que fazem: publicacoes municipais ou setoriais de orgaos locais.

```txt
DMAL, DMAM, DMBA, DMCBA, DMCE, DMCSP, DMDMS, DMFSMS, DMGSP, DMMG,
DMMS, DMMSP, DMNAMS, DMPE, DMPF, DMPI, DMSES
```

Perda para o nosso produto: baixa no core judicial; alta para monitoramento administrativo local.

### Ministerio Publico

O que fazem: atos, editais, publicacoes e expedientes dos MPs estaduais/distrital.

```txt
MPAL, MPAM, MPAP, MPCE, MPDF, MPES, MPMA, MPMG, MPMS, MPMT, MPPB,
MPPE, MPPI, MPPR, MPRJ, MPRO, MPRS, MPSC, MPSE, MPSP, MPTO
```

Perda para o nosso produto: normalmente baixa para publicacao judicial por OAB; media se o escritorio atua com procedimentos administrativos, inqueritos civis ou editais do MP.

### Defensoria

O que fazem: atos administrativos e comunicacoes de defensorias.

```txt
DPAL, DPBA, DPRJ
```

Perda para o nosso produto: baixa no core judicial.

### Tribunais de Contas

O que fazem: contas publicas, tomadas de contas, auditorias, sancoes administrativas e atos de controle externo.

```txt
TCAC, TCAL, TCAM, TCAP, TCBA, TCCE, TCEGO, TCES, TCESP, TCGO,
TCMA, TCMBA, TCMG, TCMPA, TCMT, TCPB, TCPE, TCPI, TCPR, TCRJ,
TCRN, TCRO, TCRR, TCRS, TCSC, TCSE, TCSP, TCTO, TCU
```

Perda para o nosso produto: baixa para contencioso judicial comum; alta para direito publico, licitacoes e contas.

### Administrativos/outros orgaos

O que fazem: juntas comerciais, imprensa oficial, pautas administrativas, OAB, INPI, CVM, BCB, atos legislativos e outros.

```txt
BCB, CISP, CISPR, CMP, CMPADM, CVM, DIBA, DICRS, DTM, ENAMAT, EXAL,
EXBA, EXFSBA, EXMA, EXMG, EXPE, EXPR, EXRJ, EXSP, INPI, JUCESP,
LEAL, LEBA, LEES, LEFSBA, LEMA, LEMG, LEPE, LEPR, LERJ, LERR, LERS,
LESP, LETO, LICBA, OAB, OABSP, PTMA, PTMG, TITPAUTA, TITSP
```

Perda para o nosso produto: baixa no core judicial; alta para propriedade industrial, mercado financeiro, junta comercial, tributario administrativo, OAB e legislativo.

### Revisao manual

Codigos que exigem confirmacao de origem/finalidade antes de qualquer automacao.

```txt
AMAAL, CCMG, EFAL, EMSP, JCRJ, MCRJ, MRJRJ, PPRJ, SEFAZAM, SEFAZPB,
SEFAZSC, TMMG, TMSP, TMSPDJN
```

Perda para o nosso produto: incerta. Devem ficar fora do core ate haver necessidade real.

## Conclusao sobre perdas

Nao teremos perda relevante no objetivo principal se o objetivo for:

- publicacoes judiciais por OAB/nome
- vinculacao a processo por CNJ
- triagem de prazos, audiencias e tarefas
- enriquecimento com DataJud
- monitoramento recorrente sem consulta manual

Teremos perda se compararmos contra o catalogo completo do Astrea em:

- diarios municipais/estaduais administrativos
- MPs, defensorias e tribunais de contas
- OAB, INPI, CVM, BCB, Juntas Comerciais
- pautas administrativas e atos nao judiciais
- paineis autenticados e comunicacoes pessoais que exigem login/certificado

Politica recomendada:

1. DJEN/Comunica como core.
2. DataJud como enriquecimento.
3. Domicilio Judicial Eletronico congelado fora do plano ativo.
4. PJe/e-SAJ/Projudi/Eproc autenticados como fase posterior.
5. Fora do Judiciario somente opt-in, por demanda comprovada.
