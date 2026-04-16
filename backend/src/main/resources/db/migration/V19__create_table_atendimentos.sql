CREATE TABLE atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    unidade_id UUID REFERENCES unidades(id),
    assunto VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ABERTO', 'EM_ANALISE', 'CONVERTIDO', 'ARQUIVADO')),
    etiquetas VARCHAR(255),
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_atendimentos_cliente ON atendimentos(cliente_id);
CREATE INDEX idx_atendimentos_usuario ON atendimentos(usuario_id);
CREATE INDEX idx_atendimentos_unidade ON atendimentos(unidade_id);
CREATE INDEX idx_atendimentos_status ON atendimentos(status);
CREATE INDEX idx_atendimentos_data_criacao ON atendimentos(data_criacao);
