CREATE TABLE integracoes_configuracoes (
    id UUID PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    usuario_operador_id UUID NULL REFERENCES usuarios(id),
    criado_em TIMESTAMP NOT NULL,
    atualizado_em TIMESTAMP NOT NULL
);
