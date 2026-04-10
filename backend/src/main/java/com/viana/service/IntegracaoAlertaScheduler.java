package com.viana.service;

import com.viana.model.FonteSync;
import com.viana.model.Processo;
import com.viana.model.Usuario;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.model.enums.UserRole;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class IntegracaoAlertaScheduler {

    private final FonteSyncRepository fonteSyncRepository;
    private final ProcessoRepository processoRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacaoService notificacaoService;

    @Value("${app.alertas.integracoes.thresholds:3,5,10}")
    private String thresholdsConfig;

    @Scheduled(cron = "${app.alertas.integracoes.cron:0 0 * * * *}")
    public void gerarAlertas() {
        Set<Integer> thresholds = parseThresholds();
        if (thresholds.isEmpty()) {
            return;
        }

        List<Usuario> administradores = usuarioRepository.findByPapelAndAtivoTrue(UserRole.ADMINISTRADOR);
        if (administradores.isEmpty()) {
            return;
        }

        List<FonteSync> falhas = fonteSyncRepository.findByStatusAndTentativasInOrderByAtualizadoEmDesc(
                StatusIntegracao.ERRO,
                thresholds
        );
        if (falhas.isEmpty()) {
            return;
        }

        Map<UUID, Processo> processosPorId = processoRepository.findAllById(
                falhas.stream()
                        .filter(item -> item.getReferenciaTipo() == TipoReferenciaIntegracao.PROCESSO)
                        .map(FonteSync::getReferenciaId)
                        .toList()
        ).stream().collect(Collectors.toMap(Processo::getId, Function.identity()));

        for (FonteSync falha : falhas) {
            for (Usuario admin : administradores) {
                notificacaoService.criarNotificacao(
                        admin.getId(),
                        buildTitulo(falha.getFonte()),
                        buildDescricao(falha, processosPorId.get(falha.getReferenciaId())),
                        TipoNotificacao.SISTEMA,
                        "configuracoes",
                        buildChaveExterna(falha),
                        "INTEGRACAO",
                        falha.getId()
                );
            }
        }

        log.info("[INTEGRACAO_ALERTA] Alertas avaliados para {} falha(s) de integracao.", falhas.size());
    }

    private Set<Integer> parseThresholds() {
        return Arrays.stream(thresholdsConfig.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> {
                    try {
                        return Integer.parseInt(value);
                    } catch (NumberFormatException ex) {
                        return null;
                    }
                })
                .filter(value -> value != null && value > 0)
                .collect(Collectors.toSet());
    }

    private String buildTitulo(FonteIntegracao fonte) {
        if (fonte == FonteIntegracao.DOMICILIO) {
            return "Falha recorrente no Domicilio";
        }
        if (fonte == FonteIntegracao.DATAJUD) {
            return "Falha recorrente no Datajud";
        }
        return "Falha recorrente em integracao";
    }

    private String buildDescricao(FonteSync falha, Processo processo) {
        String referencia = processo != null
                ? "Processo " + processo.getNumero() + (processo.getCliente() != null ? " (" + processo.getCliente().getNome() + ")" : "")
                : "Referencia " + (falha.getReferenciaExterna() != null ? falha.getReferenciaExterna() : falha.getReferenciaId());

        return referencia
                + " acumulou "
                + falha.getTentativas()
                + " tentativa(s) com erro. "
                + (falha.getUltimaMensagem() != null ? falha.getUltimaMensagem() : "Verifique a aba de Integracoes para reprocessar.");
    }

    private String buildChaveExterna(FonteSync falha) {
        return "INTEGRACAO_ALERTA:"
                + falha.getFonte().name()
                + ":"
                + falha.getId()
                + ":"
                + falha.getTentativas();
    }
}
