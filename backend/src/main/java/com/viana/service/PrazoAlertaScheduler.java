package com.viana.service;

import com.viana.model.Prazo;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoPrazo;
import com.viana.repository.PrazoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
        LocalDate hoje = LocalDate.now();
        LocalDate limite = hoje.plusDays(Math.max(lookaheadDays, 0));

        List<Prazo> prazos = prazoRepository.findByConcluidoFalseAndAdvogadoIsNotNullAndDataLessThanEqual(limite);
        int alertasCriados = 0;

        for (Prazo prazo : prazos) {
            AlertaPrazo alerta = resolverAlerta(prazo, hoje);
            if (alerta == null) {
                continue;
            }

            notificacaoService.criarNotificacao(
                    prazo.getAdvogado().getId(),
                    alerta.titulo(),
                    alerta.descricao(),
                    TipoNotificacao.PRAZO,
                    "prazos",
                    alerta.chaveExterna(),
                    "PRAZO",
                    prazo.getId()
            );
            alertasCriados++;
        }

        if (alertasCriados > 0) {
            log.info("[SCHEDULED] Alertas de prazo gerados: {}", alertasCriados);
        }
    }

    private AlertaPrazo resolverAlerta(Prazo prazo, LocalDate hoje) {
        long diferencaDias = ChronoUnit.DAYS.between(hoje, prazo.getData());
        String itemLabel = prazo.getTipo() == TipoPrazo.TAREFA_INTERNA ? "Tarefa" : "Prazo";

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

    private record AlertaPrazo(String titulo, String descricao, String chaveExterna) {
    }
}
