WITH catalogo(nome_uf, uf, codigos) AS (
    VALUES
        ('Acre', 'AC', ARRAY['TJAC', 'TRAC', 'TEAC', 'TRACADM', 'DOAC', 'JFACDJN', 'TEACME', 'TCAC', 'TRACDJN', 'TJACDJN', 'TEACDJN']),
        ('Alagoas', 'AL', ARRAY['JFAL', 'TEAL', 'TJAL', 'TRAL', 'EXAL', 'DMAL', 'MPAL', 'EFAL', 'DPAL', 'TCAL', 'DOMAL', 'LEAL', 'JFALPJE', 'TRALADM', 'AMAAL', 'JFALADM', 'TEALME', 'JFALDJN', 'TRALDJN', 'TJALDJN', 'TEALDJN']),
        ('Amazonas', 'AM', ARRAY['TEAM', 'TJAM', 'TRAMN', 'DOMAM', 'SEFAZAM', 'DMAM', 'DOAM', 'TRAMADM', 'TCAM', 'JFAMDJN', 'TEAMME', 'MPAM', 'TJAMDJN', 'TRAMNDJN', 'TEAMDJN']),
        ('Amapa', 'AP', ARRAY['TEAP', 'TJAP', 'TRAP', 'DOAP', 'TRAPADM', 'TCAP', 'MPAP', 'JFAPDJN', 'TEAPME', 'TJAPDJN', 'TRAPDJN', 'TEAPDJN']),
        ('Bahia', 'BA', ARRAY['TEBA', 'TJBA', 'TRBA', 'TCBA', 'TCMBA', 'DMBA', 'EXBA', 'LICBA', 'DIBA', 'DOMBA', 'EXFSBA', 'LEFSBA', 'DOEBA', 'DPBA', 'LEBA', 'TRBAADMN', 'JFBADJN', 'TEBAME', 'DMCBA', 'TJBADJN', 'TRBADJN', 'TEBADJN']),
        ('Ceara', 'CE', ARRAY['JFCE', 'TECE', 'TRCE', 'JFCEPJE', 'DMCE', 'DOCE', 'TCCE', 'MPCE', 'JFCEADM', 'TRCEADM', 'DOMCE', 'TECEME', 'JFCEDJN', 'TJCEDJN', 'TJCEADM', 'TRCEDJN', 'TECEDJN']),
        ('Distrito Federal', 'DF', ARRAY['DODF', 'TEDF', 'TRDF', 'MPDF', 'TRDFADM', 'JFDFDJN', 'TJDFDJN', 'TEDFME', 'TRDFDJN', 'TEDFDJN', 'TJDFADM']),
        ('Espirito Santo', 'ES', ARRAY['TEES', 'TJES', 'TRES', 'JFESADM', 'TCES', 'DOES', 'TRESADM', 'LEES', 'MPES', 'TEESME', 'JFESDJN', 'TJESPJEN', 'DMSES', 'TRESDJN', 'TJESDJN', 'TEESDJN']),
        ('Goias', 'GO', ARRAY['TEGO', 'TJGO', 'TRGO', 'TCGO', 'TJGOIMG', 'DOGO', 'TCEGO', 'TRGOADM', 'DOMGO', 'DOMFGO', 'JFGODJN', 'TEGOME', 'TRGODJN', 'TJGODJN', 'TEGODJN']),
        ('Maranhao', 'MA', ARRAY['TEMA', 'TJMA', 'TRMA', 'EXMA', 'PTMA', 'TCMA', 'MPMA', 'LEMA', 'TRMAADM', 'DOMMA', 'JFMADJN', 'TJMADJN', 'TEMAME', 'TRMADJN', 'TEMADJN']),
        ('Minas Gerais', 'MG', ARRAY['PTMG', 'TCMG', 'TEMG', 'TJMG', 'TJMGA', 'TMMG', 'TRMG', 'EXMG', 'MPMG', 'LEMG', 'DMMG', 'TJMGE', 'DOMMG', 'CCMG', 'TRMGADM', 'JFMGDJN', 'TEMGME', 'DOMMGN', 'TJMGDJN', 'JFMGDJN6', 'TRMGDJN', 'TJMMGDJN', 'TEMGDJN']),
        ('Mato Grosso do Sul', 'MS', ARRAY['JFMS', 'TEMS', 'TJMS', 'TRMS', 'MPMS', 'DOMMS', 'DMDMS', 'DMNAMS', 'DMFSMS', 'DOMS', 'TRMSADM', 'DMMS', 'JFMSDJN', 'TEMSME', 'TJMSDJN', 'TRMSDJN', 'TEMSDJN']),
        ('Mato Grosso', 'MT', ARRAY['TEMT', 'TJMT', 'TRMT', 'TCMT', 'DOMT', 'TRMTADM', 'MPMT', 'JFMTDJN', 'TEMTME', 'TJMTDJN', 'TJMTADM', 'TRMTDJN', 'TEMTDJN']),
        ('Para', 'PA', ARRAY['TEPA', 'TJPA', 'TRPA', 'DOPA', 'TRPAADM', 'TCMPA', 'DOMPA', 'JFPADJN', 'TJPADJN', 'TEPAME', 'TRPADJN', 'TEPADJN']),
        ('Paraiba', 'PB', ARRAY['JFPB', 'TEPB', 'TJPB', 'TRPB', 'DOPB', 'TCPB', 'JFPBPJE', 'DOMPB', 'MPPB', 'JFPBADM', 'TEPBME', 'SEFAZPB', 'JFPBDJN', 'TJPBDJN', 'TRPBADM', 'TRPBDJN']),
        ('Pernambuco', 'PE', ARRAY['JFPE', 'TEPE', 'TJPE', 'TRPE', 'EXPE', 'TCPE', 'MPPE', 'TJPEPJE', 'LEPE', 'JFPEPJE', 'TRPEADM', 'DOMPE', 'DMPE', 'JFPEADM', 'TEPEME', 'TJPEDJN', 'JFPEDJN', 'TRPEDJN', 'TEPEDJN']),
        ('Piaui', 'PI', ARRAY['TEPI', 'TJPI', 'TRPI', 'DOPI', 'TCPI', 'MPPI', 'TRPIADM', 'DMPI', 'JFPIDJN', 'TEPIME', 'TJPIDJN', 'TRPIDJN', 'TEPIDJN']),
        ('Parana', 'PR', ARRAY['JFPR', 'TEPR', 'TJPR', 'TRPR', 'TCPR', 'EXPR', 'CISPR', 'DOMPR', 'TRPRADM', 'LEPR', 'JFPRDJN', 'TJPRDJN', 'TEPRME', 'MPPR', 'TRPRDJN', 'TEPRDJN']),
        ('Rio de Janeiro', 'RJ', ARRAY['TERJ', 'TJRJ', 'MRJRJ', 'LERJ', 'PPRJ', 'TCRJ', 'EXRJ', 'TRRJN', 'MCRJ', 'JCRJ', 'TRRJADM', 'MPRJ', 'DPRJ', 'DOMRJ', 'TERJME', 'JFRJDJN', 'JFRJADM', 'TRRJNDJN', 'TJRJDJN', 'TERJDJN']),
        ('Rio Grande do Norte', 'RN', ARRAY['JFRN', 'TERN', 'TRRN', 'TJRN', 'TCRN', 'JFRNPJE', 'DOMRN', 'DORN', 'JFRNADM', 'TRRNADM', 'TERNME', 'JFRNDJN', 'TJRNDJN', 'TRRNDJN', 'TERNDJN']),
        ('Rondonia', 'RO', ARRAY['TERO', 'TRRO', 'TJRO', 'TRROADM', 'TCRO', 'DORO', 'DOMRO', 'JFRODJN', 'TJRODJN', 'TEROME', 'MPRO', 'TRRODJN', 'TERODJN']),
        ('Roraima', 'RR', ARRAY['TERR', 'TJRR', 'TRRRN', 'DORR', 'TRRRADM', 'LERR', 'DOMRR', 'TCRR', 'JFRRDJN', 'TERRME', 'TRRRNDJN', 'TJRRDJN']),
        ('Rio Grande do Sul', 'RS', ARRAY['TERS', 'TJRS', 'TRRS', 'JFRS', 'TCRS', 'DOMRS', 'DORS', 'DICRS', 'MPRS', 'TRRSADM', 'JFRSDJN', 'TERSME', 'LERS', 'TJRSDJN', 'TRRSDJN', 'TJMRSDJN', 'TERSDJN']),
        ('Santa Catarina', 'SC', ARRAY['JFSC', 'TESC', 'TJSC', 'TRSCN', 'SEFAZSC', 'TCSC', 'DOSC', 'TRSCADM', 'MPSC', 'JFSCDJN', 'TESCME', 'TJSCDJN', 'DOMSC', 'TRSCNDJN', 'TESCDJN']),
        ('Sergipe', 'SE', ARRAY['JFSE', 'TESE', 'TRSE', 'TJSE', 'JFSEPJE', 'DOSE', 'TCSE', 'MPSE', 'JFSEADM', 'TRSEADM', 'TJSEDJN', 'TESEME', 'JFSEDJN', 'TRSEDJN', 'TESEDJN']),
        ('Sao Paulo', 'SP', ARRAY['JFSP', 'TESP', 'TJSP', 'TRSP', 'LESP', 'EMSP', 'EXSP', 'TRSPN', 'CISP', 'JUCESP', 'OABSP', 'TMSP', 'DOMSP', 'TITSP', 'DMCSP', 'TITPAUTA', 'DMMSP', 'JFSPDJN', 'TESPME', 'TMSPDJN', 'DMGSP', 'TCSP', 'MPSP', 'TRSPNADM', 'TRSPADM', 'TCESP', 'DOMSP2', 'TJSPDJN', 'TRSPNDJN', 'TRSPDJN', 'TESPDJN', 'TJSP2']),
        ('Tocantins', 'TO', ARRAY['TETO', 'TJTO', 'TRTO', 'DOTO', 'TRTOADM', 'TCTO', 'LETO', 'MPTO', 'JFTODJN', 'TETOME', 'TRTODJN', 'TJTODJN', 'TETODJN']),
        ('Tribunal superior', NULL, ARRAY['STJ', 'STM', 'TRF3', 'TRF4', 'TRF5', 'TSE', 'TST', 'CNJ', 'CSJT', 'CMP', 'TCU', 'DOU', 'TRF2ADM', 'CSJTADM', 'TRF5PJE', 'TRF5ADM', 'TRF1PJE', 'OAB', 'DTM', 'INPI', 'ENAMAT', 'CMPADM', 'TSTADM', 'CVM', 'BCB', 'TRF3PAUTA', 'TRF1DJN', 'TRF4DJN', 'TRF3DJN', 'TSEME', 'TRF5DJN', 'CJFDJN', 'CORDJN', 'SEEUDJN', 'TRF2DJN', 'STFDJE', 'DMPF', 'TRF6DJN', 'TRF6ADM', 'TRF1ATA', 'TRF1PAUTAS', 'TRF1ATAS', 'TSTDJN', 'STJDJN', 'STMDJN', 'TSEDJN', 'CNJDJN'])
)
INSERT INTO publicacoes_diarios_oficiais
    (codigo, nome, uf, grupo, estrategia_coleta, status, requer_scraping, custo_estimado, observacao)
SELECT
    item.codigo,
    CASE
        WHEN catalogo.uf IS NULL THEN 'Catalogo Astrea - Tribunal superior - ' || item.codigo
        ELSE 'Catalogo Astrea - ' || catalogo.nome_uf || ' - ' || item.codigo
    END,
    catalogo.uf,
    CASE WHEN item.codigo = 'DOU' THEN 'DOU' ELSE 'LEGADO' END,
    'NAO_AUTOMATIZADO',
    'PREPARADO',
    FALSE,
    'ZERO',
    'Diario monitorado conforme catalogo do plano Astrea. Captura efetiva depende do conector configurado.'
FROM catalogo
CROSS JOIN LATERAL unnest(catalogo.codigos) AS item(codigo)
ON CONFLICT (codigo) DO NOTHING;
