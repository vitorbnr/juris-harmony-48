package com.viana.service;

import com.viana.model.Prazo;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.TipoUnidadeAlertaPrazo;
import com.viana.repository.PrazoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrazoAlertaScheduler {

    private final PrazoRepository prazoRepository;
    private final NotificacaoService notificacaoService;

    @Value("${app.alertas.prazos.lookahead-days:3}")
    private int lookaheadDays;

    @Scheduled(cron = "${app.alertas.prazos.cron:0 0 8,13 * * *}")
    @Transactional
    public void gerarAlertas() {
        LocalDateTime agora = LocalDateTime.now();
        LocalDate hoje = agora.toLocalDate();
        LocalDate limite = hoje.plusDays(Math.max(lookaheadDays, 0));

        List<Prazo> prazos = prazoRepository.findAlertaveis(limite);
        int alertasCriados = 0;

        for (Prazo prazo : prazos) {
            AlertaPrazo alerta = resolverAlerta(prazo, agora);
            if (alerta == null) {
                continue;
            }

            notificacaoService.criarNotificacao(
                    prazo.getAdvogado().getId(),
                    alerta.titulo(),
                    alerta.descricao(),
                    TipoNotificacao.PRAZO,
                    "agenda-notas",
                    alerta.chaveExterna() + ":" + prazo.getAdvogado().getId(),
                    "PRAZO",
                    prazo.getId()
            );
            alertasCriados++;

            for (var participante : prazo.getParticipantes()) {
                notificacaoService.criarNotificacao(
                        participante.getId(),
                        alerta.titulo(),
                        alerta.descricao(),
                        TipoNotificacao.PRAZO,
                        "agenda-notas",
                        alerta.chaveExterna() + ":" + participante.getId(),
                        "PRAZO",
                        prazo.getId()
                );
                alertasCriados++;
            }
        }

        if (alertasCriados > 0) {
            log.info("[SCHEDULED] Alertas de prazo gerados: {}", alertasCriados);
        }
    }

    private AlertaPrazo resolverAlerta(Prazo prazo, LocalDateTime agora) {
        LocalDate hoje = agora.toLocalDate();
        long diferencaDias = ChronoUnit.DAYS.between(hoje, prazo.getData());
        String itemLabel = switch (prazo.getTipo()) {
            case TAREFA_INTERNA -> "Tarefa";
            case AUDIENCIA -> "Audiencia";
            case REUNIAO -> "Evento";
            default -> "Prazo";
        };

        AlertaPrazo alertaCustomizado = resolverAlertaCustomizado(prazo, agora, itemLabel);
        if (alertaCustomizado != null) {
            return alertaCustomizado;
        }

        if (diferencaDias < 0) {
            return new AlertaPrazo(
                    itemLabel + " atrasado",
                    itemLabel + " \"" + prazo.getTitulo() + "\" esta atrasado desde "
                            + prazo.getData().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".",
                    "prazo-alerta:atrasado:" + prazo.getId() + ":" + hoje
            );
        }

        if (diferencaDias == 0) {
            return new AlertaPrazo(
                    itemLabel + " vence hoje",
                    itemLabel + " \"" + prazo.getTitulo() + "\" vence hoje e exige acompanhamento.",
                    "prazo-alerta:hoje:" + prazo.getId() + ":" + hoje
            );
        }

        if (diferencaDias == 1) {
            return new AlertaPrazo(
                    itemLabel + " vence amanha",
                    itemLabel + " \"" + prazo.getTitulo() + "\" vence amanha.",
                    "prazo-alerta:amanha:" + prazo.getId() + ":" + prazo.getData()
            );
        }

        if (diferencaDias == 3) {
            return new AlertaPrazo(
                    itemLabel + " se aproxima",
                    itemLabel + " \"" + prazo.getTitulo() + "\" vence em 3 dias.",
                    "prazo-alerta:3dias:" + prazo.getId() + ":" + prazo.getData()
            );
        }

        return null;
    }

    private AlertaPrazo resolverAlertaCustomizado(Prazo prazo, LocalDateTime agora, String itemLabel) {
        if (prazo.getAlertaValor() == null || prazo.getAlertaUnidade() == null) {
            return null;
        }

        if (prazo.getAlertaUnidade() == TipoUnidadeAlertaPrazo.DIAS) {
            long diferencaDias = ChronoUnit.DAYS.between(agora.toLocalDate(), prazo.getData());
            if (diferencaDias == prazo.getAlertaValor()) {
                return new AlertaPrazo(
                        itemLabel + " se aproxima",
                        itemLabel + " \"" + prazo.getTitulo() + "\" acontece em " + prazo.getAlertaValor() + " dia(s).",
                        "prazo-alerta:custom-dias:" + prazo.getId() + ":" + prazo.getData() + ":" + prazo.getAlertaValor()
                );
            }
            return null;
        }

        LocalDateTime inicioAtividade = LocalDateTime.of(
                prazo.getData(),
                prazo.getHora() != null ? prazo.getHora() : LocalTime.of(9, 0)
        );
        long diferencaHoras = ChronoUnit.HOURS.between(agora.truncatedTo(ChronoUnit.HOURS), inicioAtividade.truncatedTo(ChronoUnit.HOURS));
        if (diferencaHoras == prazo.getAlertaValor()) {
            return new AlertaPrazo(
                    itemLabel + " se aproxima",
                    itemLabel + " \"" + prazo.getTitulo() + "\" acontece em " + prazo.getAlertaValor() + " hora(s).",
                    "prazo-alerta:custom-horas:" + prazo.getId() + ":" + inicioAtividade + ":" + prazo.getAlertaValor()
            );
        }

        return null;
    }

    private record AlertaPrazo(String titulo, String descricao, String chaveExterna) {
    }
}
