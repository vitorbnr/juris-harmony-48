CREATE TABLE processo_partes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    documento VARCHAR(20),
    tipo VARCHAR(20) NOT NULL,
    polo VARCHAR(20) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    observacao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processo_partes_processo ON processo_partes(processo_id);
CREATE INDEX idx_processo_partes_documento ON processo_partes(documento);

CREATE TABLE processo_parte_representantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parte_id UUID NOT NULL REFERENCES processo_partes(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    cpf VARCHAR(11),
    oab VARCHAR(20),
    usuario_interno_id UUID REFERENCES usuarios(id),
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processo_parte_representantes_parte ON processo_parte_representantes(parte_id);
CREATE INDEX idx_processo_parte_representantes_usuario ON processo_parte_representantes(usuario_interno_id);
CREATE INDEX idx_processo_parte_representantes_cpf ON processo_parte_representantes(cpf);
