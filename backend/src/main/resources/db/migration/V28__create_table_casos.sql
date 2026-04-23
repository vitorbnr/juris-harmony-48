CREATE TABLE casos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    unidade_id UUID NOT NULL REFERENCES unidades(id),
    responsavel_id UUID NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    observacoes TEXT,
    etiquetas VARCHAR(255),
    acesso VARCHAR(20) NOT NULL CHECK (acesso IN ('PUBLICO', 'PRIVADO', 'EQUIPE')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_casos_cliente ON casos(cliente_id);
CREATE INDEX idx_casos_unidade ON casos(unidade_id);
CREATE INDEX idx_casos_responsavel ON casos(responsavel_id);
CREATE INDEX idx_casos_atualizado_em ON casos(atualizado_em);

CREATE TABLE caso_envolvidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    qualificacao VARCHAR(255)
);

CREATE INDEX idx_caso_envolvidos_caso ON caso_envolvidos(caso_id);

ALTER TABLE processos
    ADD COLUMN caso_id UUID REFERENCES casos(id);

CREATE INDEX idx_processos_caso ON processos(caso_id);
