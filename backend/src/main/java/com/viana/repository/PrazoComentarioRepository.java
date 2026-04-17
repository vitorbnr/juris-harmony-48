package com.viana.repository;

import com.viana.model.PrazoComentario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrazoComentarioRepository extends JpaRepository<PrazoComentario, UUID> {

    List<PrazoComentario> findByPrazoIdOrderByCriadoEmDesc(UUID prazoId);
}
