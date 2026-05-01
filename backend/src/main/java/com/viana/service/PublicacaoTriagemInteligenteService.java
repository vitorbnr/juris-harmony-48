package com.viana.service;

import com.viana.model.Publicacao;
import com.viana.model.enums.LadoProcessualPublicacao;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PublicacaoTriagemInteligenteService {

    private static final Pattern DIACRITICOS = Pattern.compile("\\p{M}+");
    private static final Pattern ESPACOS = Pattern.compile("\\s+");
    private static final Pattern PRAZO_DIAS = Pattern.compile(
            "(?:prazo|periodo)(?:\\s+\\w+){0,3}\\s+(?:de\\s+)?(\\d{1,3})\\s+dias?",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRAZO_EM_ATE_DIAS = Pattern.compile(
            "(?:em|ate)\\s+(\\d{1,3})\\s+dias?",
            Pattern.CASE_INSENSITIVE
    );

    private static final List<PrazoExtenso> PRAZOS_EXTENSO = List.of(
            new PrazoExtenso("cinco", 5),
            new PrazoExtenso("dez", 10),
            new PrazoExtenso("quinze", 15),
            new PrazoExtenso("trinta", 30)
    );

    private static final List<String> TERMOS_PRAZO = List.of(
            "prazo",
            "intimad",
            "intime-se",
            "manifestar",
            "manifeste",
            "vista",
            "contestacao",
            "contrarrazoes",
            "embargos",
            "recurso",
            "impugnacao",
            "cumprimento",
            "calculos",
            "emendar",
            "regularizar",
            "comprovar",
            "juntar",
            "recolher"
    );

    private static final List<String> TERMOS_AUDIENCIA = List.of(
            "audiencia",
            "sessao de julgamento",
            "conciliacao",
            "instrucao",
            "designo",
            "designada",
            "designado"
    );

    private static final List<String> TERMOS_PROVIDENCIA = List.of(
            "cite-se",
            "cumpra-se",
            "expeca-se",
            "oficie-se",
            "publique-se",
            "remetam-se",
            "aguarde-se",
            "alvara",
            "penhora",
            "bloqueio",
            "bacenjud",
            "sisbajud",
            "renajud"
    );

    private static final List<String> TERMOS_DECURSO_PRAZO = List.of(
            "decorreu o prazo",
            "decurso de prazo",
            "decurso do prazo",
            "transcorrido o prazo",
            "certifico o decurso"
    );

    private static final List<String> TERMOS_URGENCIA = List.of(
            "urgente",
            "plantao",
            "liminar",
            "tutela de urgencia",
            "antecipacao de tutela",
            "bloqueio",
            "penhora",
            "prisao",
            "busca e apreensao"
    );

    private static final List<String> TERMOS_POLO_ATIVO = List.of(
            "parte autora",
            "autor",
            "autora",
            "reclamante",
            "exequente",
            "agravante",
            "apelante",
            "recorrente"
    );

    private static final List<String> TERMOS_POLO_PASSIVO = List.of(
            "parte re",
            "reu",
            "reclamada",
            "reclamado",
            "executada",
            "executado",
            "agravado",
            "apelado",
            "recorrido"
    );

    private static final List<String> TERMOS_TERCEIRO = List.of(
            "terceiro interessado",
            "terceira interessada",
            "amicus curiae"
    );

    public void enriquecer(Publicacao publicacao) {
        String teor = publicacao.getTeor() == null ? "" : publicacao.getTeor();
        String normalizado = normalizarTexto(teor);

        Integer prazoSugerido = extrairPrazoDias(normalizado);
        boolean audiencia = contemQualquer(normalizado, TERMOS_AUDIENCIA);
        boolean decursoPrazo = contemQualquer(normalizado, TERMOS_DECURSO_PRAZO);
        boolean providencia = contemQualquer(normalizado, TERMOS_PROVIDENCIA) || decursoPrazo;
        boolean urgencia = contemQualquer(normalizado, TERMOS_URGENCIA);
        boolean termoPrazo = contemQualquer(normalizado, TERMOS_PRAZO);
        boolean prazoAtivo = prazoSugerido != null && !decursoPrazo;
        boolean termoPrazoAtivo = termoPrazo && !decursoPrazo;
        boolean riscoPrazo = prazoAtivo || termoPrazoAtivo || audiencia || urgencia || decursoPrazo;
        int score = calcularScore(publicacao, riscoPrazo, prazoSugerido, audiencia, providencia, urgencia);

        publicacao.setRiscoPrazo(riscoPrazo);
        publicacao.setScorePrioridade(score);
        publicacao.setIaConfianca(calcularConfianca(publicacao, score, riscoPrazo, prazoSugerido, audiencia, providencia, urgencia));
        publicacao.setIaPrazoSugeridoDias(decursoPrazo ? null : prazoSugerido);
        publicacao.setIaAcaoSugerida(sugerirAcao(publicacao, riscoPrazo, audiencia, providencia, urgencia, decursoPrazo));
        publicacao.setLadoProcessualEstimado(inferirLado(normalizado));
        publicacao.setResumoOperacional(gerarResumo(publicacao, riscoPrazo, prazoSugerido, audiencia, providencia, urgencia, decursoPrazo));
        publicacao.setIaTrechosRelevantes(extrairTrechoRelevante(teor));
        publicacao.setJustificativaPrioridade(gerarJustificativa(publicacao, riscoPrazo, prazoSugerido, audiencia, providencia, urgencia, decursoPrazo));
    }

    private boolean contemQualquer(String texto, List<String> termos) {
        for (String termo : termos) {
            if (texto.contains(termo)) {
                return true;
            }
        }
        return false;
    }

    private Integer extrairPrazoDias(String texto) {
        Integer dias = extrairPrazoNumerico(PRAZO_DIAS, texto);
        if (dias != null) {
            return dias;
        }

        dias = extrairPrazoNumerico(PRAZO_EM_ATE_DIAS, texto);
        if (dias != null) {
            return dias;
        }

        for (PrazoExtenso prazo : PRAZOS_EXTENSO) {
            if (texto.matches(".*(?:prazo|periodo)(?:\\s+\\w+){0,3}\\s+(?:de\\s+)?" + prazo.termo() + "\\s+dias?.*")) {
                return prazo.dias();
            }
        }

        return null;
    }

    private Integer extrairPrazoNumerico(Pattern pattern, String texto) {
        Matcher matcher = pattern.matcher(texto);
        if (!matcher.find()) {
            return null;
        }

        try {
            int dias = Integer.parseInt(matcher.group(1));
            return dias > 0 && dias <= 180 ? dias : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int calcularScore(
            Publicacao publicacao,
            boolean riscoPrazo,
            Integer prazoSugerido,
            boolean audiencia,
            boolean providencia,
            boolean urgencia
    ) {
        int score = 20;
        if (publicacao.getProcesso() == null) score += 15;
        if (publicacao.getAtribuidaPara() == null && publicacao.getResponsavelProcesso() == null) score += 5;
        if (prazoSugerido != null) score += prazoSugerido <= 5 ? 35 : 25;
        else if (riscoPrazo) score += 25;
        if (audiencia) score += 25;
        if (providencia) score += 15;
        if (urgencia) score += 20;
        return Math.min(score, 100);
    }

    private int calcularConfianca(
            Publicacao publicacao,
            int score,
            boolean riscoPrazo,
            Integer prazoSugerido,
            boolean audiencia,
            boolean providencia,
            boolean urgencia
    ) {
        int confianca = 45;
        if (publicacao.getProcesso() != null) confianca += 5;
        if (riscoPrazo) confianca += 10;
        if (prazoSugerido != null) confianca += 20;
        if (audiencia) confianca += 15;
        if (providencia) confianca += 10;
        if (urgencia) confianca += 10;
        if (score >= 80) confianca += 10;
        return Math.min(confianca, 95);
    }

    private String sugerirAcao(
            Publicacao publicacao,
            boolean riscoPrazo,
            boolean audiencia,
            boolean providencia,
            boolean urgencia,
            boolean decursoPrazo
    ) {
        if (publicacao.getProcesso() == null) {
            return "VINCULAR_PROCESSO";
        }
        if (audiencia) {
            return "CRIAR_AUDIENCIA";
        }
        if (decursoPrazo) {
            return "CRIAR_TAREFA";
        }
        if (riscoPrazo) {
            return "CRIAR_PRAZO";
        }
        if (providencia || urgencia) {
            return "CRIAR_TAREFA";
        }
        return "REVISAR_ARQUIVAR";
    }

    private LadoProcessualPublicacao inferirLado(String texto) {
        boolean ativo = contemQualquer(texto, TERMOS_POLO_ATIVO);
        boolean passivo = contemQualquer(texto, TERMOS_POLO_PASSIVO);
        boolean terceiro = contemQualquer(texto, TERMOS_TERCEIRO);

        if (terceiro && !ativo && !passivo) {
            return LadoProcessualPublicacao.TERCEIRO;
        }
        if (ativo && !passivo) {
            return LadoProcessualPublicacao.PARTE_AUTORA;
        }
        if (passivo && !ativo) {
            return LadoProcessualPublicacao.PARTE_RE;
        }
        return LadoProcessualPublicacao.INDEFINIDO;
    }

    private String gerarResumo(
            Publicacao publicacao,
            boolean riscoPrazo,
            Integer prazoSugerido,
            boolean audiencia,
            boolean providencia,
            boolean urgencia,
            boolean decursoPrazo
    ) {
        if (publicacao.getProcesso() == null) {
            return "Publicacao sem processo vinculado. Prioridade inicial: localizar o processo antes de criar prazo, tarefa ou audiencia.";
        }
        if (audiencia) {
            return "Publicacao indica audiencia ou sessao relevante. Revisar data, horario e modalidade antes de criar a agenda.";
        }
        if (decursoPrazo) {
            return "Publicacao indica decurso de prazo. Avaliar proxima providencia processual antes de arquivar.";
        }
        if (riscoPrazo) {
            String prazo = prazoSugerido != null ? " Prazo mencionado: " + prazoSugerido + " dia(s)." : "";
            return "Publicacao com indicio de providencia processual e possivel prazo." + prazo;
        }
        if (providencia || urgencia) {
            return "Publicacao indica providencia operacional relevante. Criar tarefa de acompanhamento se confirmada na triagem.";
        }
        return "Publicacao sem indicio forte de prazo. Revisar para historico, ciencia ou arquivamento seguro.";
    }

    private String gerarJustificativa(
            Publicacao publicacao,
            boolean riscoPrazo,
            Integer prazoSugerido,
            boolean audiencia,
            boolean providencia,
            boolean urgencia,
            boolean decursoPrazo
    ) {
        List<String> motivos = new ArrayList<>();

        if (publicacao.getProcesso() == null) {
            motivos.add("Sem vinculo automatico com processo.");
        }
        if (prazoSugerido != null) {
            motivos.add("Texto menciona prazo expresso de " + prazoSugerido + " dia(s).");
        }
        if (audiencia) {
            motivos.add("Texto contem termo de audiencia ou sessao.");
        }
        if (decursoPrazo) {
            motivos.add("Texto indica decurso de prazo, sugerindo tarefa de proxima providencia.");
        }
        if (riscoPrazo) {
            motivos.add("Termos juridicos indicam possivel prazo ou providencia.");
        }
        if (providencia) {
            motivos.add("Texto contem comando operacional do juizo.");
        }
        if (urgencia) {
            motivos.add("Texto contem termo de urgencia.");
        }
        if (motivos.isEmpty()) {
            return "Baixa prioridade por ausencia de termos fortes de prazo ou audiencia.";
        }
        return limitarTexto(String.join(" ", motivos), 255);
    }

    private String extrairTrechoRelevante(String teor) {
        if (teor == null || teor.isBlank()) {
            return null;
        }
        String[] linhas = teor.split("\\R+");
        for (String linha : linhas) {
            String normalizada = normalizarTexto(linha);
            if (contemQualquer(normalizada, TERMOS_AUDIENCIA)
                    || contemQualquer(normalizada, TERMOS_PRAZO)
                    || contemQualquer(normalizada, TERMOS_PROVIDENCIA)
                    || contemQualquer(normalizada, TERMOS_DECURSO_PRAZO)
                    || contemQualquer(normalizada, TERMOS_URGENCIA)) {
                return limitarTexto(ESPACOS.matcher(linha.trim()).replaceAll(" "), 500);
            }
        }
        return limitarTexto(ESPACOS.matcher(linhas[0].trim()).replaceAll(" "), 500);
    }

    private String normalizarTexto(String texto) {
        String semAcentos = DIACRITICOS.matcher(Normalizer.normalize(texto, Normalizer.Form.NFD)).replaceAll("");
        return ESPACOS.matcher(semAcentos.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    private String limitarTexto(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max - 3) + "...";
    }

    private record PrazoExtenso(String termo, int dias) {
    }
}
