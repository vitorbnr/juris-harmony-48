CREATE TABLE publicacoes_diarios_oficiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nome VARCHAR(180) NOT NULL,
    uf VARCHAR(2),
    grupo VARCHAR(40) NOT NULL,
    estrategia_coleta VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requer_scraping BOOLEAN NOT NULL DEFAULT FALSE,
    custo_estimado VARCHAR(20) NOT NULL DEFAULT 'ZERO',
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publicacoes_diarios_oficiais_grupo
    ON publicacoes_diarios_oficiais(grupo);

CREATE INDEX idx_publicacoes_diarios_oficiais_uf
    ON publicacoes_diarios_oficiais(uf);

CREATE INDEX idx_publicacoes_diarios_oficiais_status
    ON publicacoes_diarios_oficiais(status);

CREATE TABLE publicacoes_fontes_monitoradas_destinatarios (
    fonte_monitorada_id UUID NOT NULL REFERENCES publicacoes_fontes_monitoradas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (fonte_monitorada_id, usuario_id)
);

CREATE INDEX idx_publicacoes_fontes_destinatarios_usuario
    ON publicacoes_fontes_monitoradas_destinatarios(usuario_id);

CREATE TABLE publicacoes_fontes_monitoradas_diarios (
    fonte_monitorada_id UUID NOT NULL REFERENCES publicacoes_fontes_monitoradas(id) ON DELETE CASCADE,
    diario_id UUID NOT NULL REFERENCES publicacoes_diarios_oficiais(id) ON DELETE CASCADE,
    PRIMARY KEY (fonte_monitorada_id, diario_id)
);

CREATE INDEX idx_publicacoes_fontes_diarios_diario
    ON publicacoes_fontes_monitoradas_diarios(diario_id);

INSERT INTO publicacoes_diarios_oficiais
    (codigo, nome, uf, grupo, estrategia_coleta, status, requer_scraping, custo_estimado, observacao)
VALUES
    ('TJAC', 'DJEN - Tribunal de Justica do Acre', 'AC', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJAL', 'DJEN - Tribunal de Justica de Alagoas', 'AL', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJAM', 'DJEN - Tribunal de Justica do Amazonas', 'AM', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJAP', 'DJEN - Tribunal de Justica do Amapa', 'AP', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJBA', 'DJEN - Tribunal de Justica da Bahia', 'BA', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJCE', 'DJEN - Tribunal de Justica do Ceara', 'CE', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJDFT', 'DJEN - Tribunal de Justica do Distrito Federal e Territorios', 'DF', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJES', 'DJEN - Tribunal de Justica do Espirito Santo', 'ES', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJGO', 'DJEN - Tribunal de Justica de Goias', 'GO', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJMA', 'DJEN - Tribunal de Justica do Maranhao', 'MA', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJMG', 'DJEN - Tribunal de Justica de Minas Gerais', 'MG', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJMS', 'DJEN - Tribunal de Justica de Mato Grosso do Sul', 'MS', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJMT', 'DJEN - Tribunal de Justica de Mato Grosso', 'MT', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJPA', 'DJEN - Tribunal de Justica do Para', 'PA', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJPB', 'DJEN - Tribunal de Justica da Paraiba', 'PB', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJPE', 'DJEN - Tribunal de Justica de Pernambuco', 'PE', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJPI', 'DJEN - Tribunal de Justica do Piaui', 'PI', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJPR', 'DJEN - Tribunal de Justica do Parana', 'PR', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJRJ', 'DJEN - Tribunal de Justica do Rio de Janeiro', 'RJ', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJRN', 'DJEN - Tribunal de Justica do Rio Grande do Norte', 'RN', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJRO', 'DJEN - Tribunal de Justica de Rondonia', 'RO', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJRR', 'DJEN - Tribunal de Justica de Roraima', 'RR', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJRS', 'DJEN - Tribunal de Justica do Rio Grande do Sul', 'RS', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJSC', 'DJEN - Tribunal de Justica de Santa Catarina', 'SC', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJSE', 'DJEN - Tribunal de Justica de Sergipe', 'SE', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJSP', 'DJEN - Tribunal de Justica de Sao Paulo', 'SP', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('TJTO', 'DJEN - Tribunal de Justica do Tocantins', 'TO', 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Coleta por caderno DJEN/Comunica PJe, sem scraping.'),
    ('STF', 'DJEN - Supremo Tribunal Federal', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Tribunal superior em fonte oficial.'),
    ('STJ', 'DJEN - Superior Tribunal de Justica', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Tribunal superior em fonte oficial.'),
    ('TST', 'DJEN - Tribunal Superior do Trabalho', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Tribunal superior em fonte oficial.'),
    ('TSE', 'DJEN - Tribunal Superior Eleitoral', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Tribunal superior em fonte oficial.'),
    ('STM', 'DJEN - Superior Tribunal Militar', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Tribunal superior em fonte oficial.'),
    ('CNJ', 'DJEN - Conselho Nacional de Justica', NULL, 'DJEN', 'CADERNO_DJEN', 'PREPARADO', FALSE, 'ZERO', 'Fonte oficial do CNJ.'),
    ('DATAJUD', 'DataJud CNJ - movimentos de processos cadastrados', NULL, 'DATAJUD', 'API_OFICIAL', 'SUPORTADO', FALSE, 'ZERO', 'Nao e diario; complementa publicacoes por processos ja monitorados.'),
    ('DOMICILIO_JUDICIAL', 'Domicilio Judicial Eletronico', NULL, 'DOMICILIO', 'INTEGRACAO_SEGURA', 'PREPARADO', FALSE, 'ZERO', 'Fica na Inbox Juridica; leitura segura sem ciencia automatica.'),
    ('DOU_INLABS', 'Diario Oficial da Uniao - INLABS', NULL, 'DOU', 'DADOS_ABERTOS', 'PREPARADO', FALSE, 'ZERO', 'Fonte oficial para DOU quando habilitada.'),
    ('DIARIOS_ESTADUAIS_LEGADOS', 'Diarios estaduais fora do DJEN', NULL, 'LEGADO', 'NAO_AUTOMATIZADO', 'NAO_SUPORTADO', TRUE, 'ZERO', 'Nao coletar por padrao. Avaliar somente em caso extremo e documentado.'),
    ('DIARIOS_MUNICIPAIS_LEGADOS', 'Diarios municipais fora de fonte oficial estruturada', NULL, 'LEGADO', 'NAO_AUTOMATIZADO', 'NAO_SUPORTADO', TRUE, 'ZERO', 'Nao coletar por padrao. Preferir fonte oficial estruturada ou upload assistido.')
ON CONFLICT (codigo) DO NOTHING;
