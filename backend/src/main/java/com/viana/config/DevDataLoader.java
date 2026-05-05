package com.viana.config;

import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataLoader implements ApplicationRunner {

    private final PasswordEncoder passwordEncoder;
    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("DevDataLoader: iniciando ajustes de desenvolvimento.");
        atualizarSenhaAdmin();
    }

    private void atualizarSenhaAdmin() {
        Optional<Usuario> adminOpt = usuarioRepository.findByEmailIgnoreCase("admin@gmail.com");

        if (adminOpt.isEmpty()) {
            log.warn("Admin 'admin@gmail.com' nao encontrado no banco. O ajuste de senha sera ignorado.");
            log.info("Total de usuarios no banco: {}", usuarioRepository.count());
            return;
        }

        Usuario admin = adminOpt.get();
        String novaHash = passwordEncoder.encode("admin123");
        admin.setSenhaHash(novaHash);
        usuarioRepository.saveAndFlush(admin);
        log.info("Senha do admin '{}' atualizada para 'admin123'", admin.getEmail());
        log.info("Verificacao da senha: {}", passwordEncoder.matches("admin123", admin.getSenhaHash()) ? "OK" : "FALHOU");
    }
}
