package com.viana.model.enums;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;

public enum PeriodoIndicadorEquipe {
    ESTE_MES,
    MES_PASSADO,
    ULTIMOS_90_DIAS;

    public static PeriodoIndicadorEquipe from(String value) {
        if (value == null || value.isBlank()) {
            return ESTE_MES;
        }

        try {
            return PeriodoIndicadorEquipe.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return ESTE_MES;
        }
    }

    public Intervalo resolverIntervalo(LocalDate referencia) {
        return switch (this) {
            case ESTE_MES -> {
                LocalDate inicio = referencia.withDayOfMonth(1);
                yield new Intervalo(inicio.atStartOfDay(), referencia.plusDays(1).atStartOfDay());
            }
            case MES_PASSADO -> {
                LocalDate inicio = referencia.minusMonths(1).withDayOfMonth(1);
                LocalDate fimExclusivo = referencia.withDayOfMonth(1);
                yield new Intervalo(inicio.atStartOfDay(), fimExclusivo.atStartOfDay());
            }
            case ULTIMOS_90_DIAS -> {
                LocalDate inicio = referencia.minusDays(89);
                yield new Intervalo(inicio.atStartOfDay(), referencia.plusDays(1).atStartOfDay());
            }
        };
    }

    public Intervalo resolverIntervaloGrafico(LocalDate referencia) {
        Intervalo base = resolverIntervalo(referencia);
        LocalDate dataFinal = base.dataFinalInclusiva();
        LocalDate inicioUltimaSemana = dataFinal.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate inicioPrimeiraSemana = inicioUltimaSemana.minusWeeks(3);
        return new Intervalo(inicioPrimeiraSemana.atStartOfDay(), dataFinal.plusDays(1).atStartOfDay());
    }

    public record Intervalo(LocalDateTime inicio, LocalDateTime fimExclusivo) {
        public LocalDate dataFinalInclusiva() {
            return fimExclusivo.toLocalDate().minusDays(1);
        }
    }
}
