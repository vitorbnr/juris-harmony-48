package com.viana.repository;

import com.viana.model.Notificacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    Page<Notificacao> findByUsuarioIdOrderByCriadaEmDesc(UUID usuarioId, Pageable pageable);

    long countByUsuarioIdAndLidaFalse(UUID usuarioId);
}
