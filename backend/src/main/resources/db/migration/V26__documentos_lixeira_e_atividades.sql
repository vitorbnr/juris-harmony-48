ALTER TABLE documentos
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by UUID REFERENCES usuarios(id);

CREATE INDEX idx_documentos_deleted_at ON documentos(deleted_at);
