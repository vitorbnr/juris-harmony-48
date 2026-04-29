DELETE FROM publicacoes_fontes_monitoradas_diarios
WHERE diario_id IN (
    SELECT id
    FROM publicacoes_diarios_oficiais
    WHERE codigo IN ('DOU', 'DOU_INLABS')
       OR grupo = 'DOU'
);

DELETE FROM publicacoes_diarios_oficiais
WHERE codigo IN ('DOU', 'DOU_INLABS')
   OR grupo = 'DOU';

DELETE FROM publicacoes_capturas_execucoes
WHERE fonte = 'DOU';

DELETE FROM fontes_sync
WHERE fonte = 'DOU';
