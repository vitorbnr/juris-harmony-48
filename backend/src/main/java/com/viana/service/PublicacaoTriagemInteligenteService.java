package com.viana.service;

import com.viana.model.Publicacao;
import com.viana.model.enums.LadoProcessualPublicacao;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PublicacaoTriagemInteligenteService {

    private static final Pattern PRAZO_DIAS = Pattern.compile("prazo\\s+(?:de\\s+)?(\\d{1,3})\\s+dias?", Pattern.CASE_INSENSITIVE);

    public void enriquecer(Publicacao publicacao) {
        String teor = publicacao.getTeor() == null ? "" : publicacao.getTeor();
        String normalizado = teor.toLowerCase(Locale.ROOT);

        boolean riscoPrazo = contem(normalizado, "prazo", "intimad", "manifestar", "embargos", "recurso", "contestacao", "calculos", "cumprimento");
        Integer prazoSugerido = extrairPrazoDias(normalizado);
        int score = calcularScore(publicacao, normalizado, riscoPrazo, prazoSugerido);

        publicacao.setRiscoPrazo(riscoPrazo);
        publicacao.setScorePrioridade(score);
        publicacao.setIaConfianca(calcularConfianca(score, riscoPrazo, prazoSugerido));
        publicacao.setIaPrazoSugeridoDias(prazoSugerido);
        publicacao.setIaAcaoSugerida(sugerirAcao(publicacao, riscoPrazo));
        publicacao.setLadoProcessualEstimado(inferirLado(normalizado));
        publicacao.setResumoOperacional(gerarResumo(publicacao, riscoPrazo, prazoSugerido));
        publicacao.setIaTrechosRelevantes(extrairTrechoRelevante(teor));
        publicacao.setJustificativaPrioridade(gerarJustificativa(publicacao, riscoPrazo, prazoSugerido));
    }

    private boolean contem(String texto, String... termos) {
        for (String termo : termos) {
            if (texto.contains(termo)) {
                return true;
            }
        }
        return false;
    }

    private Integer extrairPrazoDias(String texto) {
        Matcher matcher = PRAZO_DIAS.matcher(texto);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int calcularScore(Publicacao publicacao, String texto, boolean riscoPrazo, Integer prazoSugerido) {
        int score = 20;
        if (riscoPrazo) score += 35;
        if (prazoSugerido != null) score += prazoSugerido <= 5 ? 25 : 15;
        if (publicacao.getProcesso() == null) score += 10;
        if (contem(texto, "urgente", "liminar", "audiencia", "bloqueio", "penhora")) score += 15;
        return Math.min(score, 100);
    }

    private int calcularConfianca(int score, boolean riscoPrazo, Integer prazoSugerido) {
        int confianca = 45;
        if (riscoPrazo) confianca += 20;
        if (prazoSugerido != null) confianca += 15;
        if (score >= 80) confianca += 10;
        return Math.min(confianca, 95);
    }

    private String sugerirAcao(Publicacao publicacao, boolean riscoPrazo) {
        if (publicacao.getProcesso() == null) {
            return "VINCULAR_PROCESSO";
        }
        return riscoPrazo ? "CRIAR_PRAZO" : "APENAS_ARQUIVAR";
    }

    private LadoProcessualPublicacao inferirLado(String texto) {
        if (contem(texto, "parte autora", "autor", "reclamante")) {
            return LadoProcessualPublicacao.PARTE_AUTORA;
        }
        if (contem(texto, "parte re", "reu", "reclamada", "executada")) {
            return LadoProcessualPublicacao.PARTE_RE;
        }
        return LadoProcessualPublicacao.INDEFINIDO;
    }

    private String gerarResumo(Publicacao publicacao, boolean riscoPrazo, Integer prazoSugerido) {
        if (publicacao.getProcesso() == null) {
            return "Publicacao recebida sem processo vinculado. Prioridade inicial: localizar o processo antes do tratamento juridico.";
        }
        if (riscoPrazo) {
            String prazo = prazoSugerido != null ? " Prazo mencionado: " + prazoSugerido + " dia(s)." : "";
            return "Publicacao com indicio de providencia processual e possivel prazo." + prazo;
        }
        return "Publicacao sem indicio forte de prazo. Revisar para historico, ciencia ou arquivamento.";
    }

    private String gerarJustificativa(Publicacao publicacao, boolean riscoPrazo, Integer prazoSugerido) {
        if (publicacao.getProcesso() == null) {
            return "Sem vinculo automatico com processo; requer triagem juridica.";
        }
        if (prazoSugerido != null) {
            return "Texto menciona prazo expresso de " + prazoSugerido + " dia(s).";
        }
        if (riscoPrazo) {
            return "Termos juridicos indicam possivel prazo ou providencia.";
        }
        return "Baixa prioridade por ausencia de termos fortes de prazo.";
    }

    private String extrairTrechoRelevante(String teor) {
        if (teor == null || teor.isBlank()) {
            return null;
        }
        String[] linhas = teor.split("\\R+");
        for (String linha : linhas) {
            String normalizada = linha.toLowerCase(Locale.ROOT);
            if (contem(normalizada, "prazo", "intimad", "manifestar", "audiencia", "calculos")) {
                return linha.trim();
            }
        }
        return linhas[0].trim();
    }
}
