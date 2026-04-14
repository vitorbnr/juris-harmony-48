package com.viana.service;

import com.viana.dto.response.DomicilioComunicacaoResponse;
import com.viana.model.EventoJuridico;
import com.viana.model.Usuario;
import com.viana.model.enums.TipoNotificacao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DomicilioSyncService {

    private final DomicilioClientService domicilioClientService;
    private final EventoJuridicoService eventoJuridicoService;
    private final FonteSyncService fonteSyncService;
    private final NotificacaoService notificacaoService;
    private final ProcessoDistribuicaoService processoDistribuicaoService;

    @Transactional
    public int sincronizar(LocalDate dataInicio, LocalDate dataFim, String numeroProcesso, boolean notificarResponsaveis) {
        String referencia = buildReferencia(numeroProcesso);

        try {
            List<DomicilioComunicacaoResponse> comunicacoes = domicilioClientService.listarComunicacoes(dataInicio, dataFim, numeroProcesso);
            List<EventoJuridico> eventos = eventoJuridicoService.registrarComunicacoesDomicilio(comunicacoes);

            fonteSyncService.registrarSucessoDomicilio(
                    referencia,
                    eventos.size(),
                    "Sincronizacao read-only do Domicilio executada"
            );

            if (notificarResponsaveis && !eventos.isEmpty()) {
                notificarResponsaveis(eventos);
            }

            return eventos.size();
        } catch (RuntimeException ex) {
            fonteSyncService.registrarErroDomicilio(referencia, ex.getMessage());
            throw ex;
        }
    }

    public boolean isEnabled() {
        return domicilioClientService.isEnabled();
    }

    private void notificarResponsaveis(List<EventoJuridico> eventos) {
        Map<UUID, Integer> resumoPorUsuario = new HashMap<>();

        for (EventoJuridico evento : eventos) {
            for (Usuario advogado : processoDistribuicaoService.resolveDestinatariosNotificacao(evento)) {
                resumoPorUsuario.merge(advogado.getId(), 1, Integer::sum);
            }
        }

        resumoPorUsuario.forEach((usuarioId, total) ->
                notificacaoService.criarNotificacao(
                        usuarioId,
                        "Novas comunicacoes do Domicilio",
                        "A Inbox Juridica recebeu " + total + " nova(s) comunicacao(oes) do Domicilio para triagem segura.",
                        TipoNotificacao.SISTEMA,
                        "inbox"
                )
        );
    }

    private String buildReferencia(String numeroProcesso) {
        if (numeroProcesso != null && !numeroProcesso.isBlank()) {
            return "PROCESSO:" + numeroProcesso.replaceAll("\\D", "");
        }
        return "DOMICILIO-INSTITUCIONAL";
    }
}
