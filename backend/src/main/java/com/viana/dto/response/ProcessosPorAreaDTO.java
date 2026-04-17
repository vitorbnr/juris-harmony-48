package com.viana.dto.response;

import com.viana.model.enums.TipoProcesso;

public record ProcessosPorAreaDTO(String area, Long quantidade) {

    public ProcessosPorAreaDTO(TipoProcesso tipo, Long quantidade) {
        this(formatarArea(tipo), quantidade);
    }

    private static String formatarArea(TipoProcesso tipo) {
        if (tipo == null) {
            return "Nao informado";
        }

        return switch (tipo) {
            case CIVEL -> "Civel";
            case TRABALHISTA -> "Trabalhista";
            case CRIMINAL -> "Criminal";
            case FAMILIA -> "Familia";
            case TRIBUTARIO -> "Tributario";
            case EMPRESARIAL -> "Empresarial";
            case PREVIDENCIARIO -> "Previdenciario";
            case ADMINISTRATIVO -> "Administrativo";
        };
    }
}
