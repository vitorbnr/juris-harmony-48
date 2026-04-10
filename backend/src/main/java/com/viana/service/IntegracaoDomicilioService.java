package com.viana.service;

import com.viana.config.DomicilioApiProperties;
import com.viana.dto.request.AtualizarIntegracaoDomicilioRequest;
import com.viana.dto.response.IntegracaoDomicilioResponse;
import com.viana.dto.response.TesteIntegracaoDomicilioResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.FonteSync;
import com.viana.model.IntegracaoConfiguracao;
import com.viana.model.Usuario;
import com.viana.model.enums.CodigoIntegracao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.IntegracaoConfiguracaoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class IntegracaoDomicilioService {

    private final IntegracaoConfiguracaoRepository integracaoConfiguracaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final FonteSyncRepository fonteSyncRepository;
    private final DomicilioApiProperties properties;
    private final DomicilioOperadorResolver domicilioOperadorResolver;
    private final DomicilioClientService domicilioClientService;

    @Value("${app.sync.domicilio.cron:0 0 */2 * * *}")
    private String domicilioCron;

    @Transactional(readOnly = true)
    public IntegracaoDomicilioResponse buscarConfiguracao() {
        IntegracaoConfiguracao configuracao = integracaoConfiguracaoRepository.findByCodigo(CodigoIntegracao.DOMICILIO)
                .orElse(null);
        Usuario usuarioOperador = configuracao != null ? configuracao.getUsuarioOperador() : null;
        boolean operadorValido = domicilioOperadorResolver.isUsuarioOperadorValido(usuarioOperador);

        DomicilioOperadorResolver.DomicilioOperadorContext contexto = domicilioOperadorResolver.findContext().orElse(null);
        FonteSync ultimoSync = fonteSyncRepository
                .findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(FonteIntegracao.DOMICILIO, TipoReferenciaIntegracao.INSTITUICAO)
                .orElse(null);

        return IntegracaoDomicilioResponse.builder()
                .enabled(properties.isEnabled())
                .readOnly(true)
                .prontaParaConsumo(isReady())
                .baseUrl(properties.getBaseUrl())
                .baseUrlConfigurada(isConfigured(properties.getBaseUrl()))
                .tokenUrlConfigurada(isConfigured(properties.getTokenUrl()))
                .clientIdConfigurado(isConfigured(properties.getClientId()))
                .clientSecretConfigurado(isConfigured(properties.getClientSecret()))
                .tenantIdConfigurado(isConfigured(properties.getTenantId()))
                .fallbackOnBehalfOfConfigurado(domicilioOperadorResolver.hasFallbackOnBehalfOfConfigured())
                .cron(domicilioCron)
                .operadorInstitucional(toOperadorResumo(usuarioOperador))
                .operadorInstitucionalValido(usuarioOperador == null || operadorValido)
                .mensagemOperador(usuarioOperador != null && !operadorValido
                        ? domicilioOperadorResolver.explainInvalidUsuarioOperador(usuarioOperador)
                        : null)
                .origemOnBehalfOf(contexto != null ? contexto.origem() : null)
                .onBehalfOfMascarado(contexto != null ? domicilioOperadorResolver.maskCpf(contexto.cpf()) : null)
                .ultimoSync(toSyncResumo(ultimoSync))
                .build();
    }

    @Transactional
    public IntegracaoDomicilioResponse atualizarConfiguracao(AtualizarIntegracaoDomicilioRequest request) {
        IntegracaoConfiguracao configuracao = integracaoConfiguracaoRepository.findByCodigo(CodigoIntegracao.DOMICILIO)
                .orElseGet(() -> IntegracaoConfiguracao.builder()
                        .codigo(CodigoIntegracao.DOMICILIO)
                        .build());

        Usuario usuarioOperador = null;
        if (request.getUsuarioOperadorId() != null) {
            usuarioOperador = usuarioRepository.findById(request.getUsuarioOperadorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario operador nao encontrado."));

            if (!Boolean.TRUE.equals(usuarioOperador.getAtivo())) {
                throw new BusinessException("O usuario operador precisa estar ativo.");
            }
            if (!Boolean.TRUE.equals(usuarioOperador.getHabilitadoDomicilio())) {
                throw new BusinessException("O usuario operador precisa estar habilitado para o Domicilio.");
            }
            String cpf = usuarioOperador.getCpf() != null ? usuarioOperador.getCpf().replaceAll("\\D", "") : "";
            if (cpf.length() != 11) {
                throw new BusinessException("O usuario operador precisa possuir CPF valido.");
            }
        }

        configuracao.setUsuarioOperador(usuarioOperador);
        integracaoConfiguracaoRepository.save(configuracao);
        return buscarConfiguracao();
    }

    @Transactional(readOnly = true)
    public TesteIntegracaoDomicilioResponse testarConexao() {
        LocalDate dataFim = LocalDate.now();
        LocalDate dataInicio = dataFim.minusDays(1);

        DomicilioOperadorResolver.DomicilioOperadorContext contexto = domicilioOperadorResolver.resolveRequiredContext();
        int comunicacoes = domicilioClientService.listarComunicacoes(dataInicio, dataFim, null).size();

        return TesteIntegracaoDomicilioResponse.builder()
                .sucesso(true)
                .readOnly(true)
                .comunicacoesEncontradas(comunicacoes)
                .dataInicio(dataInicio.toString())
                .dataFim(dataFim.toString())
                .origemOnBehalfOf(contexto.origem())
                .onBehalfOfMascarado(domicilioOperadorResolver.maskCpf(contexto.cpf()))
                .build();
    }

    private boolean isReady() {
        return properties.isEnabled()
                && isConfigured(properties.getBaseUrl())
                && isConfigured(properties.getTokenUrl())
                && isConfigured(properties.getClientId())
                && isConfigured(properties.getClientSecret())
                && domicilioOperadorResolver.findContext().isPresent();
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private IntegracaoDomicilioResponse.OperadorResumo toOperadorResumo(Usuario usuario) {
        if (usuario == null) {
            return null;
        }

        return IntegracaoDomicilioResponse.OperadorResumo.builder()
                .id(usuario.getId().toString())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .cpfMascarado(domicilioOperadorResolver.maskCpf(usuario.getCpf()))
                .build();
    }

    private IntegracaoDomicilioResponse.SyncResumo toSyncResumo(FonteSync fonteSync) {
        if (fonteSync == null) {
            return null;
        }

        return IntegracaoDomicilioResponse.SyncResumo.builder()
                .status(fonteSync.getStatus().name())
                .ultimoSyncEm(fonteSync.getUltimoSyncEm() != null ? fonteSync.getUltimoSyncEm().toString() : null)
                .ultimoSucessoEm(fonteSync.getUltimoSucessoEm() != null ? fonteSync.getUltimoSucessoEm().toString() : null)
                .proximoSyncEm(fonteSync.getProximoSyncEm() != null ? fonteSync.getProximoSyncEm().toString() : null)
                .tentativas(fonteSync.getTentativas())
                .mensagem(fonteSync.getUltimaMensagem())
                .build();
    }
}
