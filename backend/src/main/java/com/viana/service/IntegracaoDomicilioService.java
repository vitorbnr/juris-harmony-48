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
import java.util.ArrayList;
import java.util.List;

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
        List<String> pendencias = construirPendencias(configuracao, usuarioOperador, contexto);

        return IntegracaoDomicilioResponse.builder()
                .enabled(properties.isEnabled())
                .readOnly(true)
                .prontaParaConsumo(pendencias.isEmpty())
                .baseUrl(properties.getBaseUrl())
                .baseUrlConfigurada(isConfigured(properties.getBaseUrl()))
                .tokenUrlConfigurada(isConfigured(properties.getTokenUrl()))
                .clientIdConfigurado(isConfigured(properties.getClientId()))
                .clientSecretConfigurado(isConfigured(properties.getClientSecret()))
                .tenantIdConfigurado(isConfigured(properties.getTenantId()))
                .fallbackOnBehalfOfConfigurado(domicilioOperadorResolver.hasFallbackOnBehalfOfConfigured())
                .tenantIdOrigem(isConfigured(properties.getTenantId()) ? "CONFIGURADO" : "API_EU")
                .cron(domicilioCron)
                .lookbackDays(sanitizeLookbackDays())
                .operadorInstitucional(toOperadorResumo(usuarioOperador))
                .operadorInstitucionalValido(usuarioOperador == null || operadorValido)
                .mensagemOperador(usuarioOperador != null && !operadorValido
                        ? domicilioOperadorResolver.explainInvalidUsuarioOperador(usuarioOperador)
                        : null)
                .origemOnBehalfOf(contexto != null ? contexto.origem() : null)
                .onBehalfOfMascarado(contexto != null ? domicilioOperadorResolver.maskCpf(contexto.cpf()) : null)
                .ultimoSync(toSyncResumo(ultimoSync))
                .pendencias(pendencias)
                .checklistAtivacao(construirChecklistAtivacao(configuracao, contexto))
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

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private int sanitizeLookbackDays() {
        Integer value = properties.getLookbackDays();
        if (value == null || value < 1) {
            return 1;
        }
        return value;
    }

    private List<String> construirPendencias(IntegracaoConfiguracao configuracao, Usuario usuarioOperador,
                                             DomicilioOperadorResolver.DomicilioOperadorContext contexto) {
        List<String> pendencias = new ArrayList<>();

        if (!properties.isEnabled()) {
            pendencias.add("Integracao do Domicilio desabilitada no ambiente.");
        }
        if (!isConfigured(properties.getBaseUrl())) {
            pendencias.add("DOMICILIO_BASE_URL nao configurado.");
        }
        if (!isConfigured(properties.getTokenUrl())) {
            pendencias.add("DOMICILIO_TOKEN_URL nao configurado.");
        }
        if (!isConfigured(properties.getClientId())) {
            pendencias.add("DOMICILIO_CLIENT_ID nao configurado.");
        }
        if (!isConfigured(properties.getClientSecret())) {
            pendencias.add("DOMICILIO_CLIENT_SECRET nao configurado.");
        }
        if (contexto == null) {
            pendencias.add("Nenhum CPF operador efetivo foi resolvido para o header On-behalf-Of.");
        }
        if (usuarioOperador != null && !domicilioOperadorResolver.isUsuarioOperadorValido(usuarioOperador)) {
            pendencias.add(domicilioOperadorResolver.explainInvalidUsuarioOperador(usuarioOperador));
        }
        if (sanitizeLookbackDays() < 1) {
            pendencias.add("Janela de sincronizacao do Domicilio invalida.");
        }

        return pendencias;
    }

    private List<String> construirChecklistAtivacao(IntegracaoConfiguracao configuracao,
                                                    DomicilioOperadorResolver.DomicilioOperadorContext contexto) {
        List<String> checklist = new ArrayList<>();
        checklist.add("Confirmar que o CNPJ do escritorio esta habilitado no Domicilio Judicial Eletronico.");
        checklist.add("Preencher DOMICILIO_BASE_URL e DOMICILIO_TOKEN_URL com os endpoints oficiais do ambiente.");
        checklist.add("Preencher DOMICILIO_CLIENT_ID e DOMICILIO_CLIENT_SECRET com a credencial institucional.");
        checklist.add("Selecionar um operador institucional valido ou definir DOMICILIO_ON_BEHALF_OF no ambiente.");
        checklist.add("Executar o teste read-only na aba de Integracoes antes de ligar o scheduler em producao.");
        checklist.add("Validar se o tenantId sera resolvido via /api/v1/eu ou se o escritorio prefere fixar DOMICILIO_TENANT_ID.");
        checklist.add("Conferir se a janela de sincronizacao atende o escritorio. Atual: " + sanitizeLookbackDays() + " dia(s).");
        checklist.add("Manter a operacao em read-only: sem abrir inteiro teor, sem registrar ciencia, sem aceite automatico.");
        return checklist;
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
