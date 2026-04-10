package com.viana.service;

import com.viana.dto.request.CalcularPrazoRequest;
import com.viana.dto.response.CalcularPrazoResponse;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PrazoCalculadoraService {

    public CalcularPrazoResponse calcularDataLimite(CalcularPrazoRequest request) {
        boolean contarDiaInicial = Boolean.TRUE.equals(request.getContarDiaInicial());
        Set<LocalDate> feriadosExtras = request.getFeriadosExtras() == null
                ? Set.of()
                : new HashSet<>(request.getFeriadosExtras());

        LocalDate cursor = contarDiaInicial ? request.getDataInicial() : request.getDataInicial().plusDays(1);
        int restantes = request.getQuantidadeDiasUteis();
        Set<LocalDate> feriadosNacionaisMapeados = new HashSet<>();

        while (restantes > 0) {
            if (ehDiaUtil(cursor, feriadosExtras, feriadosNacionaisMapeados)) {
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

        return CalcularPrazoResponse.builder()
                .dataSugerida(dataLimite.toString())
                .quantidadeDiasUteis(request.getQuantidadeDiasUteis())
                .contarDiaInicial(contarDiaInicial)
                .feriadosNacionaisConsiderados(feriadosNacionaisConsiderados)
                .feriadosExtrasConsiderados(feriadosExtrasConsiderados)
                .observacao("Considera sabados, domingos e feriados nacionais federais. Feriados locais, atos do tribunal e suspensoes forenses devem ser revisados manualmente.")
                .build();
    }

    private boolean ehDiaUtil(LocalDate data, Set<LocalDate> feriadosExtras, Set<LocalDate> feriadosNacionaisMapeados) {
        DayOfWeek dayOfWeek = data.getDayOfWeek();
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }

        Set<LocalDate> feriadosNacionaisAno = feriadosNacionaisFederais(data.getYear());
        feriadosNacionaisMapeados.addAll(feriadosNacionaisAno);

        return !feriadosExtras.contains(data) && !feriadosNacionaisAno.contains(data);
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
}
