package com.viana.service;

import com.viana.model.PublicacaoJobLock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicacaoJobLockService {

    private static final String INSTANCE_ID = resolverInstanceId();

    private final EntityManager entityManager;

    @Transactional
    public Optional<JobLockHandle> tentarAdquirir(String nome, Duration ttl) {
        String lockName = normalizarNome(nome);
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime expiraEm = agora.plus(ttlSeguro(ttl));

        try {
            PublicacaoJobLock lock = entityManager.find(PublicacaoJobLock.class, lockName, LockModeType.PESSIMISTIC_WRITE);
            if (lock == null) {
                lock = new PublicacaoJobLock();
                lock.setNome(lockName);
                aplicarLock(lock, agora, expiraEm);
                entityManager.persist(lock);
                entityManager.flush();
                return Optional.of(new JobLockHandle(lockName, INSTANCE_ID));
            }

            if (lock.getLockedUntil() != null && lock.getLockedUntil().isAfter(agora)) {
                return Optional.empty();
            }

            aplicarLock(lock, agora, expiraEm);
            return Optional.of(new JobLockHandle(lockName, INSTANCE_ID));
        } catch (PersistenceException ex) {
            log.debug("[JOB_LOCK] Nao foi possivel adquirir lock {}: {}", lockName, ex.getMessage());
            return Optional.empty();
        }
    }

    @Transactional
    public void liberar(JobLockHandle handle) {
        if (handle == null) {
            return;
        }

        LocalDateTime agora = LocalDateTime.now();
        PublicacaoJobLock lock = entityManager.find(PublicacaoJobLock.class, handle.nome(), LockModeType.PESSIMISTIC_WRITE);
        if (lock == null
                || !handle.owner().equals(lock.getLockedBy())
                || lock.getLockedUntil() == null
                || !lock.getLockedUntil().isAfter(agora)) {
            log.debug("[JOB_LOCK] Lock {} nao foi liberado pela instancia {}; pode ter expirado ou trocado de dono.",
                    handle.nome(), handle.owner());
            return;
        }

        lock.setLockedUntil(agora);
        lock.setAtualizadoEm(agora);
    }

    private void aplicarLock(PublicacaoJobLock lock, LocalDateTime agora, LocalDateTime expiraEm) {
        lock.setLockedAt(agora);
        lock.setLockedUntil(expiraEm);
        lock.setLockedBy(INSTANCE_ID);
        lock.setAtualizadoEm(agora);
    }

    private String normalizarNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("Nome do lock e obrigatorio.");
        }
        return nome.trim().toUpperCase();
    }

    private Duration ttlSeguro(Duration ttl) {
        if (ttl == null || ttl.isNegative() || ttl.isZero()) {
            return Duration.ofMinutes(30);
        }
        return ttl.compareTo(Duration.ofMinutes(5)) < 0 ? Duration.ofMinutes(5) : ttl;
    }

    private static String resolverInstanceId() {
        String host = "unknown";
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (Exception ignored) {
            // Hostname e apenas metadado operacional do lock.
        }
        return host + ":" + ManagementFactory.getRuntimeMXBean().getName() + ":" + UUID.randomUUID();
    }

    public record JobLockHandle(String nome, String owner) {
    }
}
