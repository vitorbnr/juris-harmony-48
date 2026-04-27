package com.viana.config;

import com.viana.model.Processo;
import com.viana.model.Publicacao;
import com.viana.model.enums.LadoProcessualPublicacao;
import com.viana.model.Usuario;
import com.viana.model.enums.StatusTratamento;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.PublicacaoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataLoader implements ApplicationRunner {

    private final PasswordEncoder passwordEncoder;
    private final UsuarioRepository usuarioRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final ProcessoRepository processoRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("DevDataLoader: iniciando carga de dados de desenvolvimento.");
        atualizarSenhaAdmin();
        seedPublicacoes();
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

    private void seedPublicacoes() {
        if (publicacaoRepository.count() > 0) {
            log.info("DevDataLoader: publicacoes ja existentes, seed ignorado.");
            return;
        }

        Processo processoVinculado = processoRepository.findAll().stream().findFirst().orElse(null);
        LocalDateTime agora = LocalDateTime.now();

        List<Publicacao> publicacoes = List.of(
                Publicacao.builder()
                        .npu("0001234-56.2026.8.05.0001")
                        .tribunalOrigem("TJBA - Diario da Justica")
                        .teor("Fica a parte autora intimada para se manifestar sobre o laudo pericial no prazo legal.\n\nA secretaria certifica a publicacao nesta data para fins de controle interno.")
                        .dataPublicacao(agora.minusHours(2))
                        .statusTratamento(StatusTratamento.PENDENTE)
                        .processo(processoVinculado)
                        .iaAcaoSugerida("CRIAR_PRAZO")
                        .iaPrazoSugeridoDias(5)
                        .resumoOperacional("Manifestacao sobre laudo pericial com indicio de prazo curto e necessidade de revisao tecnica.")
                        .riscoPrazo(true)
                        .scorePrioridade(94)
                        .justificativaPrioridade("Prazo sugerido pela IA e processo ja vinculado.")
                        .iaConfianca(88)
                        .iaTrechosRelevantes("Fica a parte autora intimada para se manifestar sobre o laudo pericial no prazo legal.")
                        .ladoProcessualEstimado(LadoProcessualPublicacao.PARTE_AUTORA)
                        .build(),
                Publicacao.builder()
                        .npu("0009876-12.2026.5.05.0010")
                        .tribunalOrigem("TRT5 - DEJT")
                        .teor("Publica-se despacho determinando a apresentacao de calculos atualizados pela reclamada.\n\nO cartorio registra a disponibilizacao para triagem manual pela equipa.")
                        .dataPublicacao(agora.minusDays(1).plusHours(3))
                        .statusTratamento(StatusTratamento.PENDENTE)
                        .resumoOperacional("Despacho com exigencia de calculos atualizados e ausencia de vinculacao automatica.")
                        .riscoPrazo(true)
                        .scorePrioridade(81)
                        .justificativaPrioridade("Publicacao sem processo vinculado e com potencial de gerar providencia.")
                        .iaAcaoSugerida("VINCULAR_PROCESSO")
                        .iaConfianca(73)
                        .iaTrechosRelevantes("determinando a apresentacao de calculos atualizados pela reclamada")
                        .ladoProcessualEstimado(LadoProcessualPublicacao.PARTE_RE)
                        .build(),
                Publicacao.builder()
                        .npu(null)
                        .tribunalOrigem("TJBA - Diario da Justica")
                        .teor("Aviso de publicacao referente a expediente interno sem vinculacao automatica de processo.\n\nMantido apenas como historico de homologacao da funcionalidade.")
                        .dataPublicacao(agora.minusDays(2))
                        .statusTratamento(StatusTratamento.TRATADA)
                        .iaAcaoSugerida("APENAS_ARQUIVAR")
                        .resumoOperacional("Expediente interno sem impacto processual identificado.")
                        .riscoPrazo(false)
                        .scorePrioridade(18)
                        .justificativaPrioridade("Sem indicio de prazo ou necessidade de acao.")
                        .iaConfianca(91)
                        .iaTrechosRelevantes("expediente interno sem vinculacao automatica de processo")
                        .ladoProcessualEstimado(LadoProcessualPublicacao.INDEFINIDO)
                        .build()
        );

        publicacaoRepository.saveAll(publicacoes);
        log.info("DevDataLoader: {} publicacoes mockadas inseridas.", publicacoes.size());
    }
}
