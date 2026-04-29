ALTER TABLE publicacoes_capturas_execucoes
    ADD COLUMN erro_tipo VARCHAR(80),
    ADD COLUMN erro_codigo_http INTEGER,
    ADD COLUMN erro_detalhe TEXT;
