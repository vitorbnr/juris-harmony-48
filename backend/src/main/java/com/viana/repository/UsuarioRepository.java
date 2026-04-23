package com.viana.repository;

import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.projection.TotalPorUsuarioProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCpf(String cpf);

    List<Usuario> findByPapelAndAtivoTrue(UserRole papel);

    List<Usuario> findByAtivoTrueOrderByNomeAsc();

    @Query(value = """
        SELECT
            pa.usuario_id AS usuarioId,
            COUNT(DISTINCT p.id) AS total
        FROM processo_advogados pa
        JOIN processos p ON p.id = pa.processo_id
        WHERE p.status IN ('EM_ANDAMENTO', 'URGENTE', 'AGUARDANDO')
          AND NOT (
              UPPER(p.numero) LIKE 'ATD-%'
              AND p.status = 'AGUARDANDO'
              AND p.data_distribuicao IS NULL
          )
        GROUP BY pa.usuario_id
    """, nativeQuery = true)
    List<TotalPorUsuarioProjection> countProcessosAtivosPorResponsavel();
}
