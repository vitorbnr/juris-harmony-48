package com.viana.controller;

import com.viana.dto.request.LoginRequest;
import com.viana.dto.request.RefreshTokenRequest;
import com.viana.dto.response.TokenResponse;
import com.viana.service.AuthService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ── PATCH-003: Rate Limiting — máx. 10 tentativas por IP por minuto ──────
    // ConcurrentHashMap é suficiente para instância única (single-node).
    // Em multi-node (cluster), substituir por Bucket4j + Redis/Hazelcast.
    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    private Bucket getBucket(String ip) {
        return loginBuckets.computeIfAbsent(ip, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1))))
                .build());
    }

    private String resolveIp(HttpServletRequest req) {
        String ip = req.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) return req.getRemoteAddr();
        // X-Forwarded-For pode conter múltiplos IPs (proxy chain); pegar o primeiro
        return ip.split(",")[0].trim();
    }
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        String ip = resolveIp(httpRequest);

        // PATCH-003: verificar rate limit antes de qualquer processamento
        if (!getBucket(ip).tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build(); // 429
        }

        request.setIpAddress(ip);
        TokenResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshTokenRequest body) {
        // PATCH-009: invalidar o refresh token no servidor ao fazer logout
        if (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()) {
            authService.revogarRefreshToken(body.getRefreshToken());
        }
        return ResponseEntity.noContent().build();
    }
}
