package com.viana.repository;

import com.viana.model.Notificacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {
 
    Page<Notificacao> findByUsuarioIdOrderByCriadaEmDesc(UUID usuarioId, Pageable pageable);
 
    long countByUsuarioIdAndLidaFalse(UUID usuarioId);

    boolean existsByUsuarioIdAndChaveExterna(UUID usuarioId, String chaveExterna);
 
    @Modifying
    @Query("UPDATE Notificacao n SET n.lida = true WHERE n.usuario.id = :usuarioId AND n.lida = false")
    void marcarTodasComoLidas(@Param("usuarioId") UUID usuarioId);
}
