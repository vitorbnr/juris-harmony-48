package com.viana.service;

import com.viana.dto.request.LoginRequest;
import com.viana.dto.request.RefreshTokenRequest;
import com.viana.dto.response.TokenResponse;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.UsuarioRepository;
import com.viana.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UsuarioRepository usuarioRepository;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional
    public TokenResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getSenha()));

            String accessToken = jwtTokenProvider.generateAccessToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(request.getEmail());

            Usuario usuario = usuarioRepository.findByEmailIgnoreCase(request.getEmail())
                    .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

            // Log de auditoria do login
            try {
                logAuditoriaService.registrar(usuario.getId(), TipoAcao.ACESSOU, ModuloLog.SISTEMA,
                        "Login realizado: " + usuario.getNome());
            } catch (Exception ignored) {}

            return buildTokenResponse(accessToken, refreshToken, usuario);

        } catch (Exception e) {
            throw new BadCredentialsException("E-mail ou senha inválidos");
        }
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token inválido ou expirado");
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        String newAccessToken = jwtTokenProvider.generateAccessToken(email);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email);

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Usuário não encontrado"));

        return buildTokenResponse(newAccessToken, newRefreshToken, usuario);
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
