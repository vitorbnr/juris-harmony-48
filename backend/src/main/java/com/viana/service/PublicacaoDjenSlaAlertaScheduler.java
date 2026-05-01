package com.viana.service;

import com.viana.dto.response.PublicacaoMonitoramentoResponse;
import com.viana.model.Usuario;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.UserRole;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublicacaoDjenSlaAlertaScheduler {

    private static final Set<String> STATUS_ALERTAVEIS = Set.of("ERRO", "ATRASADO");

    private final PublicacaoMonitoramentoService monitoramentoService;
    private final UsuarioRepository usuarioRepository;
    private final NotificacaoService notificacaoService;

    @Value("${app.alertas.publicacoes.djen-sla.enabled:true}")
    private boolean enabled;

    @Value("${app.alertas.publicacoes.djen-sla.max-itens:8}")
    private int maxItens;

    @Value("${app.alertas.publicacoes.djen-sla.alertar-nunca-executado:false}")
    private boolean alertarNuncaExecutado;

    @Scheduled(cron = "${app.alertas.publicacoes.djen-sla.cron:0 15 8 * * *}")
    public void gerarAlertas() {
        if (!enabled) {
            return;
        }

        List<Usuario> administradores = usuarioRepository.findByPapelAndAtivoTrue(UserRole.ADMINISTRADOR);
        if (administradores.isEmpty()) {
            return;
        }

        List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> diariosCriticos =
                monitoramentoService.listarDjenDiariosSaude()
                        .stream()
                        .filter(this::isAlertavel)
                        .sorted(Comparator
                                .comparingInt(this::pesoStatus)
                                .thenComparing(PublicacaoMonitoramentoResponse.CapturaDiarioSaude::getUf,
                                        Comparator.nullsLast(String::compareTo))
                                .thenComparing(PublicacaoMonitoramentoResponse.CapturaDiarioSaude::getCodigo))
                        .toList();

        if (diariosCriticos.isEmpty()) {
            return;
        }

        String descricao = buildDescricao(diariosCriticos);
        String chave = "PUBLICACOES_DJEN_SLA:" + LocalDate.now();
        for (Usuario admin : administradores) {
            notificacaoService.criarNotificacao(
                    admin.getId(),
                    "Alerta de captura DJEN",
                    descricao,
                    TipoNotificacao.SISTEMA,
                    "configuracoes",
                    chave + ":" + admin.getId(),
                    "PUBLICACAO_CAPTURA",
                    null
            );
        }

        log.info("[PUBLICACOES_DJEN_SLA] Alertas avaliados para {} diario(s) critico(s).", diariosCriticos.size());
    }

    private boolean isAlertavel(PublicacaoMonitoramentoResponse.CapturaDiarioSaude diario) {
        if (diario == null || diario.getStatus() == null) {
            return false;
        }
        return STATUS_ALERTAVEIS.contains(diario.getStatus())
                || (alertarNuncaExecutado && "NUNCA_EXECUTADO".equals(diario.getStatus()));
    }

    private String buildDescricao(List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> diariosCriticos) {
        int limite = Math.max(1, maxItens);
        String resumo = diariosCriticos.stream()
                .limit(limite)
                .map(this::formatarDiario)
                .collect(Collectors.joining(", "));

        if (diariosCriticos.size() > limite) {
            resumo += " e mais " + (diariosCriticos.size() - limite) + " diario(s)";
        }

        return diariosCriticos.size()
                + " diario(s) DJEN exigem atencao na captura automatica: "
                + resumo
                + ". Verifique Configuracoes > Publicacoes.";
    }

    private String formatarDiario(PublicacaoMonitoramentoResponse.CapturaDiarioSaude diario) {
        String status = switch (diario.getStatus()) {
            case "ERRO" -> "erro";
            case "ATRASADO" -> "atrasado";
            case "NUNCA_EXECUTADO" -> "nunca executado";
            default -> diario.getStatus().toLowerCase();
        };
        return diario.getCodigo() + " (" + status + ")";
    }

    private int pesoStatus(PublicacaoMonitoramentoResponse.CapturaDiarioSaude diario) {
        return switch (diario.getStatus()) {
            case "ERRO" -> 0;
            case "ATRASADO" -> 1;
            case "NUNCA_EXECUTADO" -> 2;
            default -> 3;
        };
    }
}
