package com.viana.config;

import com.viana.service.MigracaoAstreaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
@Profile("migracao-astrea")
@RequiredArgsConstructor
@Slf4j
public class MigracaoAstreaRunner implements ApplicationRunner {

    private final MigracaoAstreaService migracaoAstreaService;
    private final ConfigurableApplicationContext applicationContext;

    @Value("${app.migracao-astrea.fase:}")
    private String fase;

    @Value("${app.migracao-astrea.contatos-path:C:/Users/vitor/OneDrive/Documents/Contatos.csv}")
    private String contatosPath;

    @Value("${app.migracao-astrea.unidade-padrao:Carinhanha}")
    private String unidadePadrao;

    @Value("${app.migracao-astrea.dry-run:false}")
    private boolean dryRun;

    @Value("${app.migracao-astrea.exit:true}")
    private boolean exitAfterRun;

    @Override
    public void run(ApplicationArguments args) {
        if (!isFaseContatos()) {
            log.info("Migracao Astrea: nenhuma fase executada. Informe app.migracao-astrea.fase=contatos.");
            exitIfNeeded(0);
            return;
        }

        MigracaoAstreaService.ResultadoImportacaoContatos resultado =
                migracaoAstreaService.importarContatos(Path.of(contatosPath), unidadePadrao, dryRun);
        log.info("Resultado da Fase 1 - contatos Astrea: {}", resultado);
        exitIfNeeded(0);
    }

    private boolean isFaseContatos() {
        String normalized = fase == null ? "" : fase.trim().toLowerCase();
        return normalized.equals("contatos")
                || normalized.equals("fase1")
                || normalized.equals("fase-1")
                || normalized.equals("fase1-contatos");
    }

    private void exitIfNeeded(int code) {
        if (!exitAfterRun) {
            return;
        }
        int exitCode = SpringApplication.exit(applicationContext, () -> code);
        System.exit(exitCode);
    }
}
