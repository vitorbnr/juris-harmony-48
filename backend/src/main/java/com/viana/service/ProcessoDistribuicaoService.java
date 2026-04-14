package com.viana.service;

import com.viana.model.EventoJuridico;
import com.viana.model.Processo;
import com.viana.model.ProcessoParte;
import com.viana.model.ProcessoParteRepresentante;
import com.viana.model.Usuario;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ProcessoDistribuicaoService {

    public Usuario resolveResponsavelPadrao(Processo processo) {
        return resolveDestinatariosProcesso(processo).stream()
                .findFirst()
                .orElse(null);
    }

    public DistribuicaoAutomatica resolveDistribuicaoAutomatica(Processo processo, String destinatario) {
        if (processo == null) {
            return null;
        }

        String destinatarioNormalizado = normalizeMatchKey(destinatario);
        String destinatarioCompacto = normalizeCompactKey(destinatario);
        if (isSearchKeyInsuficiente(destinatarioNormalizado, destinatarioCompacto)) {
            return null;
        }

        for (ProcessoParte parte : getPartes(processo)) {
            List<Usuario> representantes = resolveRepresentantesCorrespondentes(parte, destinatarioNormalizado, destinatarioCompacto);
            if (!representantes.isEmpty()) {
                return new DistribuicaoAutomatica(representantes.get(0), parte.getNome());
            }
        }

        for (ProcessoParte parte : getPartes(processo)) {
            if (!matchesTarget(destinatarioNormalizado, destinatarioCompacto, parte.getNome())) {
                continue;
            }

            List<Usuario> representantes = resolveRepresentantesInternos(parte);
            if (!representantes.isEmpty()) {
                return new DistribuicaoAutomatica(representantes.get(0), parte.getNome());
            }
        }

        for (Usuario advogado : resolveAdvogadosAtivos(processo)) {
            if (matchesTarget(destinatarioNormalizado, destinatarioCompacto,
                    advogado.getNome(), advogado.getOab(), advogado.getCpf())) {
                return new DistribuicaoAutomatica(advogado, null);
            }
        }

        return null;
    }

    public List<Usuario> resolveDestinatariosNotificacao(EventoJuridico evento) {
        if (evento == null) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        addIfAtivo(destinatarios, evento.getResponsavel());

        Processo processo = evento.getProcesso();
        if (processo == null) {
            return List.copyOf(destinatarios.values());
        }

        resolveUsuariosPorParteRelacionada(processo, evento.getParteRelacionada())
                .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        resolveUsuariosPorDestinatario(processo, evento.getDestinatario())
                .forEach(usuario -> addIfAtivo(destinatarios, usuario));

        if (destinatarios.isEmpty()) {
            resolveDestinatariosProcesso(processo)
                    .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        }

        return List.copyOf(destinatarios.values());
    }

    public List<Usuario> resolveDestinatariosProcesso(Processo processo) {
        if (processo == null) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        resolveRepresentantesInternosDoProcesso(processo)
                .forEach(usuario -> addIfAtivo(destinatarios, usuario));

        if (destinatarios.isEmpty()) {
            resolveAdvogadosAtivos(processo)
                    .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        }

        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveUsuariosPorParteRelacionada(Processo processo, String parteRelacionada) {
        String parteNormalizada = normalizeMatchKey(parteRelacionada);
        String parteCompacta = normalizeCompactKey(parteRelacionada);
        if (isSearchKeyInsuficiente(parteNormalizada, parteCompacta)) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        for (ProcessoParte parte : getPartes(processo)) {
            if (!matchesTarget(parteNormalizada, parteCompacta, parte.getNome())) {
                continue;
            }

            resolveRepresentantesInternos(parte)
                    .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        }

        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveUsuariosPorDestinatario(Processo processo, String destinatario) {
        String destinatarioNormalizado = normalizeMatchKey(destinatario);
        String destinatarioCompacto = normalizeCompactKey(destinatario);
        if (isSearchKeyInsuficiente(destinatarioNormalizado, destinatarioCompacto)) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        for (ProcessoParte parte : getPartes(processo)) {
            resolveRepresentantesCorrespondentes(parte, destinatarioNormalizado, destinatarioCompacto)
                    .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        }

        if (destinatarios.isEmpty()) {
            for (Usuario advogado : resolveAdvogadosAtivos(processo)) {
                if (matchesTarget(destinatarioNormalizado, destinatarioCompacto,
                        advogado.getNome(), advogado.getOab(), advogado.getCpf())) {
                    addIfAtivo(destinatarios, advogado);
                }
            }
        }

        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveRepresentantesInternosDoProcesso(Processo processo) {
        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        for (ProcessoParte parte : getPartes(processo)) {
            resolveRepresentantesInternos(parte)
                    .forEach(usuario -> addIfAtivo(destinatarios, usuario));
        }
        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveRepresentantesInternos(ProcessoParte parte) {
        if (parte == null || parte.getRepresentantes() == null || parte.getRepresentantes().isEmpty()) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        parte.getRepresentantes().stream()
                .filter(representante -> representante.getUsuarioInterno() != null)
                .filter(representante -> Boolean.TRUE.equals(representante.getUsuarioInterno().getAtivo()))
                .sorted(Comparator
                        .comparing((ProcessoParteRepresentante representante) -> !Boolean.TRUE.equals(representante.getPrincipal()))
                        .thenComparing(representante -> sortKey(representante.getUsuarioInterno().getNome())))
                .map(ProcessoParteRepresentante::getUsuarioInterno)
                .forEach(usuario -> addIfAtivo(destinatarios, usuario));

        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveRepresentantesCorrespondentes(
            ProcessoParte parte,
            String alvoNormalizado,
            String alvoCompacto
    ) {
        if (parte == null || parte.getRepresentantes() == null || parte.getRepresentantes().isEmpty()) {
            return List.of();
        }

        Map<UUID, Usuario> destinatarios = new LinkedHashMap<>();
        parte.getRepresentantes().stream()
                .filter(representante -> representante.getUsuarioInterno() != null)
                .filter(representante -> Boolean.TRUE.equals(representante.getUsuarioInterno().getAtivo()))
                .filter(representante -> matchesTarget(
                        alvoNormalizado,
                        alvoCompacto,
                        representante.getNome(),
                        representante.getOab(),
                        representante.getCpf(),
                        representante.getUsuarioInterno().getNome(),
                        representante.getUsuarioInterno().getOab(),
                        representante.getUsuarioInterno().getCpf()
                ))
                .sorted(Comparator
                        .comparing((ProcessoParteRepresentante representante) -> !Boolean.TRUE.equals(representante.getPrincipal()))
                        .thenComparing(representante -> sortKey(representante.getUsuarioInterno().getNome())))
                .map(ProcessoParteRepresentante::getUsuarioInterno)
                .forEach(usuario -> addIfAtivo(destinatarios, usuario));

        return List.copyOf(destinatarios.values());
    }

    private List<Usuario> resolveAdvogadosAtivos(Processo processo) {
        if (processo == null || processo.getAdvogados() == null || processo.getAdvogados().isEmpty()) {
            return List.of();
        }

        return processo.getAdvogados().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .sorted(Comparator.comparing(usuario -> sortKey(usuario.getNome())))
                .toList();
    }

    private List<ProcessoParte> getPartes(Processo processo) {
        if (processo == null || processo.getPartes() == null || processo.getPartes().isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(processo.getPartes());
    }

    private void addIfAtivo(Map<UUID, Usuario> destinatarios, Usuario usuario) {
        if (usuario == null || usuario.getId() == null || !Boolean.TRUE.equals(usuario.getAtivo())) {
            return;
        }
        destinatarios.putIfAbsent(usuario.getId(), usuario);
    }

    private boolean matchesTarget(String alvoNormalizado, String alvoCompacto, String... candidatos) {
        for (String candidato : candidatos) {
            if (isTextMatch(alvoNormalizado, candidato) || isCompactMatch(alvoCompacto, candidato)) {
                return true;
            }
        }
        return false;
    }

    private boolean isTextMatch(String alvoNormalizado, String candidato) {
        String candidatoNormalizado = normalizeMatchKey(candidato);
        if (alvoNormalizado == null || candidatoNormalizado == null) {
            return false;
        }

        if (alvoNormalizado.equals(candidatoNormalizado)) {
            return true;
        }

        if (candidatoNormalizado.length() >= 5 && alvoNormalizado.contains(candidatoNormalizado)) {
            return true;
        }

        return alvoNormalizado.length() >= 5 && candidatoNormalizado.contains(alvoNormalizado);
    }

    private boolean isCompactMatch(String alvoCompacto, String candidato) {
        String candidatoCompacto = normalizeCompactKey(candidato);
        if (alvoCompacto == null || candidatoCompacto == null) {
            return false;
        }

        if (alvoCompacto.equals(candidatoCompacto)) {
            return true;
        }

        if (candidatoCompacto.length() >= 4 && alvoCompacto.contains(candidatoCompacto)) {
            return true;
        }

        return alvoCompacto.length() >= 4 && candidatoCompacto.contains(alvoCompacto);
    }

    private boolean isSearchKeyInsuficiente(String normalizado, String compacto) {
        boolean textoInsuficiente = normalizado == null || normalizado.length() < 3;
        boolean identificadorInsuficiente = compacto == null || compacto.length() < 3;
        return textoInsuficiente && identificadorInsuficiente;
    }

    private String normalizeMatchKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit} ]", " ")
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();

        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeCompactKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        return normalized.isBlank() ? null : normalized;
    }

    private String sortKey(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    public record DistribuicaoAutomatica(Usuario responsavel, String parteRelacionada) {
    }
}
