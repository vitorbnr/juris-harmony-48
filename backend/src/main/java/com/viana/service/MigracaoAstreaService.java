package com.viana.service;

import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Unidade;
import com.viana.model.enums.TipoCliente;
import com.viana.repository.ClienteRepository;
import com.viana.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigracaoAstreaService {

    private static final String TAG_TIPO_ASTREA = "[MIGRACAO_ASTREA] tipo_legado=";

    private final ClienteRepository clienteRepository;
    private final UnidadeRepository unidadeRepository;

    @Transactional
    public ResultadoImportacaoContatos importarContatos(Path arquivoCsv, UUID unidadePadraoId, boolean dryRun) {
        if (arquivoCsv == null || !Files.exists(arquivoCsv)) {
            throw new ResourceNotFoundException("Arquivo de contatos do Astrea nao encontrado: " + arquivoCsv);
        }

        Unidade unidadePadrao = unidadeRepository.findById(unidadePadraoId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade padrao da migracao nao encontrada"));

        List<List<String>> linhas = lerCsv(arquivoCsv);
        if (linhas.isEmpty()) {
            return ResultadoImportacaoContatos.vazio(dryRun);
        }

        Map<String, Integer> indices = mapearCabecalho(linhas.get(0));
        validarCabecalho(indices);

        Map<String, Cliente> mapaPorCpf = new LinkedHashMap<>();
        Map<String, Cliente> mapaPorNome = new LinkedHashMap<>();
        popularMapasComClientesExistentes(mapaPorCpf, mapaPorNome);

        Map<Cliente, TipoLegadoAstrea> tipoLegadoPorCliente = new IdentityHashMap<>();
        Set<Cliente> alterados = new LinkedHashSet<>();
        Set<Cliente> criados = new LinkedHashSet<>();

        int linhasLidas = 0;
        int ignoradasSemNome = 0;
        int duplicadas = 0;
        int conflitosPromovidos = 0;
        int documentosInvalidos = 0;

        for (int i = 1; i < linhas.size(); i++) {
            ContatoAstrea contato = toContato(linhas.get(i), indices);
            if (contato.vazio()) {
                continue;
            }

            linhasLidas++;
            if (contato.nome() == null) {
                ignoradasSemNome++;
                continue;
            }

            if (contato.documentoOriginal() != null && contato.cpfCnpj() == null) {
                documentosInvalidos++;
            }

            Cliente cliente = localizarCliente(contato, mapaPorCpf, mapaPorNome).orElse(null);
            boolean novo = cliente == null;

            if (novo) {
                cliente = Cliente.builder()
                        .nome(contato.nome())
                        .tipo(contato.tipoPessoa())
                        .cpfCnpj(contato.cpfCnpj())
                        .email(contato.email())
                        .telefone(contato.telefone())
                        .cidade(null)
                        .estado(null)
                        .unidade(unidadePadrao)
                        .ativo(true)
                        .dataCadastro(contato.dataCadastro() != null ? contato.dataCadastro() : LocalDate.now())
                        .build();
                criados.add(cliente);
            } else {
                duplicadas++;
            }

            TipoLegadoAstrea tipoAnterior = tipoLegadoPorCliente.getOrDefault(
                    cliente,
                    extrairTipoLegado(cliente.getComentarios()).orElse(TipoLegadoAstrea.CONTATO)
            );
            TipoLegadoAstrea tipoResolvido = resolverPrioridade(tipoAnterior, contato.tipoLegado());
            if (tipoAnterior != tipoResolvido) {
                conflitosPromovidos++;
            }
            tipoLegadoPorCliente.put(cliente, tipoResolvido);

            mergeCliente(cliente, contato, unidadePadrao);
            atualizarMapas(cliente, mapaPorCpf, mapaPorNome);
            alterados.add(cliente);
        }

        for (Map.Entry<Cliente, TipoLegadoAstrea> entry : tipoLegadoPorCliente.entrySet()) {
            Cliente cliente = entry.getKey();
            cliente.setComentarios(aplicarTagTipoLegado(cliente.getComentarios(), entry.getValue()));
            alterados.add(cliente);
        }

        if (!dryRun && !alterados.isEmpty()) {
            clienteRepository.saveAll(alterados);
        }

        int atualizados = Math.max(0, alterados.size() - criados.size());
        ResultadoImportacaoContatos resultado = new ResultadoImportacaoContatos(
                linhasLidas,
                ignoradasSemNome,
                duplicadas,
                alterados.size(),
                criados.size(),
                atualizados,
                conflitosPromovidos,
                documentosInvalidos,
                dryRun
        );
        log.info("Migracao Astrea contatos finalizada: {}", resultado);
        return resultado;
    }

    @Transactional
    public ResultadoImportacaoContatos importarContatos(Path arquivoCsv, String unidadePadraoNome, boolean dryRun) {
        Unidade unidade = unidadeRepository.findAll().stream()
                .filter(candidate -> candidate.getNome().equalsIgnoreCase(unidadePadraoNome)
                        || candidate.getCidade().equalsIgnoreCase(unidadePadraoNome))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Unidade padrao da migracao nao encontrada: " + unidadePadraoNome));
        return importarContatos(arquivoCsv, unidade.getId(), dryRun);
    }

    private void popularMapasComClientesExistentes(Map<String, Cliente> mapaPorCpf, Map<String, Cliente> mapaPorNome) {
        for (Cliente cliente : clienteRepository.findAll()) {
            String cpfKey = documentoKey(cliente.getCpfCnpj());
            if (cpfKey != null) {
                mapaPorCpf.putIfAbsent(cpfKey, cliente);
            }

            String nomeKey = nomeKey(cliente.getNome());
            if (nomeKey != null) {
                mapaPorNome.putIfAbsent(nomeKey, cliente);
            }
        }
    }

    private Optional<Cliente> localizarCliente(
            ContatoAstrea contato,
            Map<String, Cliente> mapaPorCpf,
            Map<String, Cliente> mapaPorNome) {
        String cpfKey = documentoKey(contato.cpfCnpj());
        if (cpfKey != null && mapaPorCpf.containsKey(cpfKey)) {
            return Optional.of(mapaPorCpf.get(cpfKey));
        }

        String nomeKey = nomeKey(contato.nome());
        if (nomeKey != null && mapaPorNome.containsKey(nomeKey)) {
            return Optional.of(mapaPorNome.get(nomeKey));
        }

        return Optional.empty();
    }

    private void mergeCliente(Cliente cliente, ContatoAstrea contato, Unidade unidadePadrao) {
        if (isBlank(cliente.getNome())) {
            cliente.setNome(contato.nome());
        }

        if (cliente.getTipo() == null || cliente.getTipo() == TipoCliente.PESSOA_FISICA && contato.tipoPessoa() == TipoCliente.PESSOA_JURIDICA) {
            cliente.setTipo(contato.tipoPessoa());
        }

        if (isBlank(cliente.getCpfCnpj()) && contato.cpfCnpj() != null) {
            cliente.setCpfCnpj(contato.cpfCnpj());
        }
        if (isBlank(cliente.getEmail()) && contato.email() != null) {
            cliente.setEmail(contato.email());
        }
        if (isBlank(cliente.getTelefone()) && contato.telefone() != null) {
            cliente.setTelefone(contato.telefone());
        }
        if (isBlank(cliente.getRg()) && contato.rg() != null && contato.tipoPessoa() == TipoCliente.PESSOA_FISICA) {
            cliente.setRg(contato.rg());
        }
        if (isBlank(cliente.getProfissao()) && contato.profissao() != null) {
            cliente.setProfissao(contato.profissao());
        }
        if (isBlank(cliente.getAtividadeEconomica()) && contato.atividadeEconomica() != null) {
            cliente.setAtividadeEconomica(contato.atividadeEconomica());
        }
        if (isBlank(cliente.getEstadoCivil()) && contato.estadoCivil() != null) {
            cliente.setEstadoCivil(contato.estadoCivil());
        }
        if (cliente.getDataNascimento() == null && contato.dataNascimento() != null) {
            cliente.setDataNascimento(contato.dataNascimento());
        }
        if (isBlank(cliente.getNomePai()) && contato.nomePai() != null) {
            cliente.setNomePai(contato.nomePai());
        }
        if (isBlank(cliente.getNomeMae()) && contato.nomeMae() != null) {
            cliente.setNomeMae(contato.nomeMae());
        }
        if (isBlank(cliente.getNaturalidade()) && contato.naturalidade() != null) {
            cliente.setNaturalidade(contato.naturalidade());
        }
        if (isBlank(cliente.getNacionalidade()) && contato.nacionalidade() != null) {
            cliente.setNacionalidade(contato.nacionalidade());
        }
        if (cliente.getDataCadastro() == null && contato.dataCadastro() != null) {
            cliente.setDataCadastro(contato.dataCadastro());
        }
        if (cliente.getUnidade() == null) {
            cliente.setUnidade(unidadePadrao);
        }
        if (cliente.getAtivo() == null) {
            cliente.setAtivo(true);
        }
        if (cliente.getFalecido() == null) {
            cliente.setFalecido(false);
        }

        String comentarios = juntarComentarios(cliente.getComentarios(), contato.comentarios());
        cliente.setComentarios(comentarios);
    }

    private void atualizarMapas(Cliente cliente, Map<String, Cliente> mapaPorCpf, Map<String, Cliente> mapaPorNome) {
        String cpfKey = documentoKey(cliente.getCpfCnpj());
        if (cpfKey != null) {
            mapaPorCpf.putIfAbsent(cpfKey, cliente);
        }

        String nomeKey = nomeKey(cliente.getNome());
        if (nomeKey != null) {
            mapaPorNome.putIfAbsent(nomeKey, cliente);
        }
    }

    private ContatoAstrea toContato(List<String> linha, Map<String, Integer> indices) {
        String nome = firstNonBlank(
                valor(linha, indices, "nomeempresa"),
                valor(linha, indices, "apelidonomefantasia"),
                valor(linha, indices, "empresacontato")
        );
        nome = limit(normalizeOptionalText(nome), 200);

        String documentoOriginal = normalizeOptionalText(valor(linha, indices, "cpfcnpj"));
        String documento = normalizeDocumentoValido(documentoOriginal);
        TipoCliente tipoPessoa = parseTipoPessoa(valor(linha, indices, "pessoa"), documento);

        return new ContatoAstrea(
                nome,
                documento,
                documentoOriginal,
                limit(normalizeOptionalText(valor(linha, indices, "email")), 200),
                limit(normalizeOptionalText(valor(linha, indices, "telefone")), 20),
                parseTipoLegado(valor(linha, indices, "tipo")),
                tipoPessoa,
                limit(normalizeOptionalText(valor(linha, indices, "rgie")), 30),
                limit(normalizeOptionalText(valor(linha, indices, "profissaocargo")), 100),
                limit(normalizeOptionalText(valor(linha, indices, "atividadeeconomica")), 150),
                limit(normalizeOptionalText(valor(linha, indices, "estadocivil")), 50),
                parseData(valor(linha, indices, "nascimento")),
                limit(normalizeOptionalText(valor(linha, indices, "nomedopai")), 200),
                limit(normalizeOptionalText(valor(linha, indices, "nomedamae")), 200),
                limit(normalizeOptionalText(valor(linha, indices, "naturalidade")), 150),
                limit(normalizeOptionalText(valor(linha, indices, "nacionalidade")), 100),
                normalizeOptionalText(valor(linha, indices, "comentarios")),
                parseData(valor(linha, indices, "datadecadastro"))
        );
    }

    private TipoCliente parseTipoPessoa(String pessoa, String documento) {
        String normalized = normalizeKey(pessoa);
        if (normalized.contains("juridica")) {
            return TipoCliente.PESSOA_JURIDICA;
        }
        if (documento != null && documento.length() == 14) {
            return TipoCliente.PESSOA_JURIDICA;
        }
        return TipoCliente.PESSOA_FISICA;
    }

    private TipoLegadoAstrea parseTipoLegado(String tipo) {
        String normalized = normalizeKey(tipo);
        return normalized.contains("cliente") ? TipoLegadoAstrea.CLIENTE : TipoLegadoAstrea.CONTATO;
    }

    private TipoLegadoAstrea resolverPrioridade(TipoLegadoAstrea atual, TipoLegadoAstrea novo) {
        if (atual == TipoLegadoAstrea.CLIENTE || novo == TipoLegadoAstrea.CLIENTE) {
            return TipoLegadoAstrea.CLIENTE;
        }
        return TipoLegadoAstrea.CONTATO;
    }

    private Optional<TipoLegadoAstrea> extrairTipoLegado(String comentarios) {
        if (comentarios == null) {
            return Optional.empty();
        }
        if (comentarios.contains(TAG_TIPO_ASTREA + TipoLegadoAstrea.CLIENTE.name())) {
            return Optional.of(TipoLegadoAstrea.CLIENTE);
        }
        if (comentarios.contains(TAG_TIPO_ASTREA + TipoLegadoAstrea.CONTATO.name())) {
            return Optional.of(TipoLegadoAstrea.CONTATO);
        }
        return Optional.empty();
    }

    private String aplicarTagTipoLegado(String comentarios, TipoLegadoAstrea tipo) {
        String semTag = removerTagTipoLegado(comentarios);
        String tag = TAG_TIPO_ASTREA + tipo.name();
        return isBlank(semTag) ? tag : semTag + "\n" + tag;
    }

    private String removerTagTipoLegado(String comentarios) {
        if (comentarios == null) {
            return null;
        }

        List<String> linhas = comentarios.lines()
                .filter(linha -> !linha.startsWith(TAG_TIPO_ASTREA))
                .toList();
        return normalizeOptionalText(String.join("\n", linhas));
    }

    private String juntarComentarios(String atual, String novo) {
        String novoNormalizado = normalizeOptionalText(novo);
        if (novoNormalizado == null) {
            return atual;
        }

        String atualSemTag = removerTagTipoLegado(atual);
        if (atualSemTag != null && atualSemTag.contains(novoNormalizado)) {
            return atual;
        }
        return isBlank(atualSemTag) ? novoNormalizado : atualSemTag + "\n" + novoNormalizado;
    }

    private List<List<String>> lerCsv(Path path) {
        try {
            String conteudo = Files.readString(path, StandardCharsets.UTF_8);
            if (conteudo.startsWith("\uFEFF")) {
                conteudo = conteudo.substring(1);
            }
            char delimiter = detectarDelimitador(conteudo);
            return parseCsv(conteudo, delimiter);
        } catch (IOException e) {
            throw new BusinessException("Falha ao ler CSV de contatos do Astrea: " + e.getMessage());
        }
    }

    private char detectarDelimitador(String conteudo) {
        int comma = 0;
        int semicolon = 0;
        boolean quoted = false;
        for (int i = 0; i < conteudo.length(); i++) {
            char c = conteudo.charAt(i);
            if (c == '"') {
                quoted = !quoted;
                continue;
            }
            if (!quoted && (c == '\n' || c == '\r')) {
                break;
            }
            if (!quoted && c == ',') {
                comma++;
            } else if (!quoted && c == ';') {
                semicolon++;
            }
        }
        return semicolon > comma ? ';' : ',';
    }

    private List<List<String>> parseCsv(String conteudo, char delimiter) {
        List<List<String>> linhas = new ArrayList<>();
        List<String> linha = new ArrayList<>();
        StringBuilder campo = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < conteudo.length(); i++) {
            char c = conteudo.charAt(i);

            if (quoted) {
                if (c == '"') {
                    if (i + 1 < conteudo.length() && conteudo.charAt(i + 1) == '"') {
                        campo.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    campo.append(c);
                }
                continue;
            }

            if (c == '"') {
                quoted = true;
            } else if (c == delimiter) {
                linha.add(campo.toString());
                campo.setLength(0);
            } else if (c == '\n') {
                linha.add(campo.toString());
                campo.setLength(0);
                linhas.add(linha);
                linha = new ArrayList<>();
            } else if (c == '\r') {
                if (i + 1 < conteudo.length() && conteudo.charAt(i + 1) == '\n') {
                    continue;
                }
                linha.add(campo.toString());
                campo.setLength(0);
                linhas.add(linha);
                linha = new ArrayList<>();
            } else {
                campo.append(c);
            }
        }

        if (!linha.isEmpty() || campo.length() > 0) {
            linha.add(campo.toString());
            linhas.add(linha);
        }
        return linhas;
    }

    private Map<String, Integer> mapearCabecalho(List<String> cabecalho) {
        Map<String, Integer> indices = new HashMap<>();
        for (int i = 0; i < cabecalho.size(); i++) {
            indices.put(normalizeKey(cabecalho.get(i)), i);
        }
        return indices;
    }

    private void validarCabecalho(Map<String, Integer> indices) {
        List<String> obrigatorios = List.of("tipo", "pessoa", "nomeempresa", "cpfcnpj");
        for (String campo : obrigatorios) {
            if (!indices.containsKey(campo)) {
                throw new BusinessException("CSV de contatos sem coluna obrigatoria: " + campo);
            }
        }
    }

    private String valor(List<String> linha, Map<String, Integer> indices, String key) {
        Integer index = indices.get(key);
        if (index == null || index >= linha.size()) {
            return null;
        }
        return linha.get(index);
    }

    private String normalizeDocumentoValido(String value) {
        String digits = documentoKey(value);
        if (digits == null) {
            return null;
        }
        return (digits.length() == 11 || digits.length() == 14) ? digits : null;
    }

    private String documentoKey(String value) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            return null;
        }
        String digits = normalized.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
    }

    private String nomeKey(String nome) {
        String normalized = normalizeOptionalText(nome);
        if (normalized == null) {
            return null;
        }
        return normalized.replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9]", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            String normalized = normalizeOptionalText(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private LocalDate parseData(String value) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            return null;
        }

        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("d/M/yyyy")
        );
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(normalized, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private enum TipoLegadoAstrea {
        CLIENTE,
        CONTATO
    }

    private record ContatoAstrea(
            String nome,
            String cpfCnpj,
            String documentoOriginal,
            String email,
            String telefone,
            TipoLegadoAstrea tipoLegado,
            TipoCliente tipoPessoa,
            String rg,
            String profissao,
            String atividadeEconomica,
            String estadoCivil,
            LocalDate dataNascimento,
            String nomePai,
            String nomeMae,
            String naturalidade,
            String nacionalidade,
            String comentarios,
            LocalDate dataCadastro
    ) {
        boolean vazio() {
            return nome == null && cpfCnpj == null && email == null && telefone == null;
        }
    }

    public record ResultadoImportacaoContatos(
            int linhasLidas,
            int linhasIgnoradasSemNome,
            int duplicidadesResolvidas,
            int registrosUnicosAfetados,
            int novosRegistros,
            int registrosAtualizados,
            int conflitosTipoPromovidosParaCliente,
            int documentosInvalidosIgnorados,
            boolean dryRun
    ) {
        static ResultadoImportacaoContatos vazio(boolean dryRun) {
            return new ResultadoImportacaoContatos(0, 0, 0, 0, 0, 0, 0, 0, dryRun);
        }
    }
}
