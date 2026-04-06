package com.viana.service;

import com.viana.dto.request.LoginRequest;
import com.viana.dto.request.RefreshTokenRequest;
import com.viana.dto.response.TokenResponse;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.RefreshTokenRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional
    public TokenResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getSenha()));

            String accessToken  = jwtTokenProvider.generateAccessToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(request.getEmail());

            Usuario usuario = usuarioRepository.findByEmailIgnoreCase(request.getEmail())
                    .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

            // PATCH-009: registrar o hash do refresh token na tabela de controle
            refreshTokenRepository.salvar(
                    usuario.getId(),
                    sha256Hex(refreshToken),
                    LocalDateTime.now().plusSeconds(604800) // 7 dias
            );

            // Log de auditoria do login bem-sucedido
            try {
                logAuditoriaService.registrar(usuario.getId(), TipoAcao.ACESSOU, ModuloLog.SISTEMA,
                        "Login realizado: " + usuario.getNome());
            } catch (Exception ignored) {}

            return buildTokenResponse(accessToken, refreshToken, usuario);

        } catch (BadCredentialsException e) {
            throw e; // já formatada corretamente
        } catch (Exception e) {
            // PATCH-004: log de tentativa inválida de autenticação (sem expor dados internos)
            log.warn("[SECURITY] Tentativa de autenticação inválida para: {}",
                    maskEmail(request.getEmail()));
            throw new BadCredentialsException("E-mail ou senha inválidos");
        }
    }

    @Transactional
    public TokenResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token inválido ou expirado");
        }

        // PATCH-009: verificar se o token não foi revogado (está na blacklist)
        if (refreshTokenRepository.isRevogado(sha256Hex(refreshToken))) {
            throw new BadCredentialsException("Refresh token revogado. Faça login novamente.");
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        String newAccessToken  = jwtTokenProvider.generateAccessToken(email);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email);

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Usuário não encontrado"));

        // Revogar o token antigo e registrar o novo
        refreshTokenRepository.revogar(sha256Hex(refreshToken));
        refreshTokenRepository.salvar(
                usuario.getId(),
                sha256Hex(newRefreshToken),
                LocalDateTime.now().plusSeconds(604800)
        );

        return buildTokenResponse(newAccessToken, newRefreshToken, usuario);
    }

    /**
     * PATCH-009: Revoga um refresh token no logout.
     * O token permanece na tabela marcado como revogado até expirar
     * (uma rotina de limpeza pode remover tokens expirados periodicamente).
     */
    @Transactional
    public void revogarRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        try {
            refreshTokenRepository.revogar(sha256Hex(rawRefreshToken));
        } catch (Exception e) {
            log.warn("[SECURITY] Falha ao revogar refresh token: {}", e.getMessage());
        }
    }

    // ── Utilitários ──────────────────────────────────────────────────────────

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    /** Mascara o email para logs (ex: us***@gmail.com) */
    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String local = parts[0];
        String maskedLocal = local.length() <= 2
                ? "*".repeat(local.length())
                : local.substring(0, 2) + "*".repeat(local.length() - 2);
        return maskedLocal + "@" + parts[1];
    }

    private TokenResponse buildTokenResponse(String accessToken, String refreshToken, Usuario usuario) {
        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tipo("Bearer")
                .expiresIn(28800)
                .usuario(TokenResponse.UsuarioResumoResponse.builder()
                        .id(usuario.getId().toString())
                        .nome(usuario.getNome())
                        .email(usuario.getEmail())
                        .papel(usuario.getPapel().name())
                        .cargo(usuario.getCargo())
                        .initials(usuario.getInitials())
                        .unidadeId(usuario.getUnidade().getId().toString())
                        .unidadeNome(usuario.getUnidade().getNome())
                        .build())
                .build();
    }
}
