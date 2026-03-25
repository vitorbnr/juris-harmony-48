package com.viana.repository;

import com.viana.model.Pasta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PastaRepository extends JpaRepository<Pasta, UUID> {

    List<Pasta> findByParentIdIsNull();

    List<Pasta> findByParentId(UUID parentId);

    List<Pasta> findByClienteId(UUID clienteId);
}
