package com.viana.util;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class CnjUtils {

    /**
     * Extrai a sigla do tribunal no formato exigido pela API do Datajud
     * com base na estrutura do número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).
     */
    public static String getSiglaDatajud(String numeroCnj) {
        if (numeroCnj == null) return null;

        String cleanCnj = numeroCnj.replaceAll("\\D", "");
        if (cleanCnj.length() != 20) {
            throw new IllegalArgumentException("O número CNJ deve conter 20 dígitos.");
        }

        int j = Integer.parseInt(cleanCnj.substring(13, 14));
        int tr = Integer.parseInt(cleanCnj.substring(14, 16));

        return switch (j) {
            case 8 -> "tj" + getEstadoUf(tr);
            case 5 -> tr == 0 ? "tst" : "trt" + tr;
            case 4 -> tr == 0 ? "stj" : "trf" + tr;
            case 3 -> "stj";
            case 6 -> tr == 0 ? "tse" : "tre-" + getEstadoUf(tr);
            case 7 -> "stm";
            case 9 -> "tjm" + getEstadoUf(tr);
            case 1 -> "stf";
            default -> throw new IllegalArgumentException("Segmento do Judiciário desconhecido: " + j);
        };
    }

    /**
     * Mapeamento oficial do código TR para UF no padrão da numeração CNJ.
     */
    private static String getEstadoUf(int tr) {
        return switch (tr) {
            case 1 -> "ac";
            case 2 -> "al";
            case 3 -> "ap";
            case 4 -> "am";
            case 5 -> "ba";
            case 6 -> "ce";
            case 7 -> "dft";
            case 8 -> "es";
            case 9 -> "go";
            case 10 -> "ma";
            case 11 -> "mt";
            case 12 -> "ms";
            case 13 -> "mg";
            case 14 -> "pa";
            case 15 -> "pb";
            case 16 -> "pr";
            case 17 -> "pe";
            case 18 -> "pi";
            case 19 -> "rj";
            case 20 -> "rn";
            case 21 -> "rs";
            case 22 -> "ro";
            case 23 -> "rr";
            case 24 -> "sc";
            case 25 -> "se";
            case 26 -> "sp";
            case 27 -> "to";
            default -> throw new IllegalArgumentException("Código de Tribunal (TR) inválido: " + tr);
        };
    }

    /**
     * Monta a URL completa do endpoint de busca para o processo específico.
     */
    public static String buildDatajudSearchUrl(String baseUrl, String numeroCnj) {
        String sigla = getSiglaDatajud(numeroCnj);
        return String.format("%s/api_publica_%s/_search", baseUrl, sigla);
    }
}
