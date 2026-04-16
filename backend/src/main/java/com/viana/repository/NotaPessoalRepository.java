package com.viana.repository;

import com.viana.model.NotaPessoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotaPessoalRepository extends JpaRepository<NotaPessoal, UUID> {

    Optional<NotaPessoal> findByUsuarioId(UUID usuarioId);
}
