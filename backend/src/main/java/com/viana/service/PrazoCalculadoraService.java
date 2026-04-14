package com.viana.service;

import com.viana.dto.request.CalcularPrazoRequest;
import com.viana.dto.request.PeriodoSuspensaoRequest;
import com.viana.dto.response.CalcularPrazoResponse;
import com.viana.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PrazoCalculadoraService {

    public CalcularPrazoResponse calcularDataLimite(CalcularPrazoRequest request) {
        boolean contarDiaInicial = Boolean.TRUE.equals(request.getContarDiaInicial());
        Set<LocalDate> feriadosExtras = request.getFeriadosExtras() == null
                ? Set.of()
                : new HashSet<>(request.getFeriadosExtras());
        Set<LocalDate> feriadosLocais = request.getFeriadosLocais() == null
                ? Set.of()
                : new HashSet<>(request.getFeriadosLocais());
        List<PeriodoSuspensao> suspensoes = normalizarSuspensoes(request.getSuspensoes());

        LocalDate cursor = contarDiaInicial ? request.getDataInicial() : request.getDataInicial().plusDays(1);
        int restantes = request.getQuantidadeDiasUteis();
        Set<LocalDate> feriadosNacionaisMapeados = new HashSet<>();
        Set<LocalDate> suspensoesConsideradas = new HashSet<>();

        while (restantes > 0) {
            if (ehDiaUtil(cursor, feriadosExtras, feriadosLocais, suspensoes, feriadosNacionaisMapeados, suspensoesConsideradas)) {
                restantes--;
                if (restantes == 0) {
                    break;
                }
            }
            cursor = cursor.plusDays(1);
        }

        LocalDate dataLimite = cursor;

        List<String> feriadosNacionaisConsiderados = feriadosNacionaisMapeados.stream()
                .filter(data -> !data.isBefore(request.getDataInicial()) && !data.isAfter(dataLimite))
                .sorted()
                .map(LocalDate::toString)
                .toList();

        List<String> feriadosExtrasConsiderados = feriadosExtras.stream()
                .filter(data -> !data.isBefore(request.getDataInicial()) && !data.isAfter(dataLimite))
                .sorted(Comparator.naturalOrder())
                .map(LocalDate::toString)
                .toList();

        List<String> feriadosLocaisConsiderados = feriadosLocais.stream()
                .filter(data -> !data.isBefore(request.getDataInicial()) && !data.isAfter(dataLimite))
                .sorted(Comparator.naturalOrder())
                .map(LocalDate::toString)
                .toList();

        List<String> suspensoesPeriodoConsideradas = suspensoes.stream()
                .filter(periodo -> !periodo.dataFim().isBefore(request.getDataInicial()) && !periodo.dataInicio().isAfter(dataLimite))
                .sorted(Comparator.comparing(PeriodoSuspensao::dataInicio).thenComparing(PeriodoSuspensao::dataFim))
                .map(periodo -> periodo.dataInicio() + " a " + periodo.dataFim())
                .toList();

        return CalcularPrazoResponse.builder()
                .dataSugerida(dataLimite.toString())
                .quantidadeDiasUteis(request.getQuantidadeDiasUteis())
                .contarDiaInicial(contarDiaInicial)
                .feriadosNacionaisConsiderados(feriadosNacionaisConsiderados)
                .feriadosExtrasConsiderados(feriadosExtrasConsiderados)
                .feriadosLocaisConsiderados(feriadosLocaisConsiderados)
                .suspensoesConsideradas(suspensoesPeriodoConsideradas)
                .observacao(buildObservacao(feriadosLocaisConsiderados, suspensoesConsideradas))
                .build();
    }

    private boolean ehDiaUtil(
            LocalDate data,
            Set<LocalDate> feriadosExtras,
            Set<LocalDate> feriadosLocais,
            List<PeriodoSuspensao> suspensoes,
            Set<LocalDate> feriadosNacionaisMapeados,
            Set<LocalDate> suspensoesConsideradas
    ) {
        DayOfWeek dayOfWeek = data.getDayOfWeek();
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }

        Set<LocalDate> feriadosNacionaisAno = feriadosNacionaisFederais(data.getYear());
        feriadosNacionaisMapeados.addAll(feriadosNacionaisAno);

        if (feriadosExtras.contains(data) || feriadosLocais.contains(data) || feriadosNacionaisAno.contains(data)) {
            return false;
        }

        for (PeriodoSuspensao periodo : suspensoes) {
            if (!data.isBefore(periodo.dataInicio()) && !data.isAfter(periodo.dataFim())) {
                suspensoesConsideradas.add(data);
                return false;
            }
        }

        return true;
    }

    private Set<LocalDate> feriadosNacionaisFederais(int year) {
        List<LocalDate> datas = new ArrayList<>();
        datas.add(LocalDate.of(year, 1, 1));
        datas.add(LocalDate.of(year, 4, 21));
        datas.add(LocalDate.of(year, 5, 1));
        datas.add(LocalDate.of(year, 9, 7));
        datas.add(LocalDate.of(year, 10, 12));
        datas.add(LocalDate.of(year, 11, 2));
        datas.add(LocalDate.of(year, 11, 15));
        datas.add(LocalDate.of(year, 11, 20));
        datas.add(LocalDate.of(year, 12, 25));
        return new HashSet<>(datas);
    }

    private List<PeriodoSuspensao> normalizarSuspensoes(List<PeriodoSuspensaoRequest> request) {
        if (request == null || request.isEmpty()) {
            return List.of();
        }

        return request.stream()
                .map(item -> {
                    if (item.getDataInicio().isAfter(item.getDataFim())) {
                        throw new BusinessException("Periodo de suspensao invalido: data inicial posterior a data final.");
                    }
                    return new PeriodoSuspensao(item.getDataInicio(), item.getDataFim());
                })
                .distinct()
                .sorted(Comparator.comparing(PeriodoSuspensao::dataInicio).thenComparing(PeriodoSuspensao::dataFim))
                .collect(Collectors.toList());
    }

    private String buildObservacao(List<String> feriadosLocais, Set<LocalDate> suspensoesConsideradas) {
        List<String> observacoes = new ArrayList<>();
        observacoes.add("Considera sabados, domingos e feriados nacionais federais.");

        if (!feriadosLocais.isEmpty()) {
            observacoes.add("Feriados locais informados foram considerados.");
        }
        if (!suspensoesConsideradas.isEmpty()) {
            observacoes.add("Periodos de suspensao informados foram considerados.");
        }

        observacoes.add("Atos do tribunal, regras especificas do foro e validacao juridica final continuam necessarios.");
        return String.join(" ", observacoes);
    }

    private record PeriodoSuspensao(LocalDate dataInicio, LocalDate dataFim) {
    }
}
