package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponse {
    private String id;
    private String nome;
    private String tipo;
    private String cpfCnpj;
    private String email;
    private String telefone;
    private String cidade;
    private String estado;
    private String dataCadastro;
    private String rg;
    private String ctps;
    private String pis;
    private String tituloEleitorNumero;
    private String tituloEleitorZona;
    private String tituloEleitorSessao;
    private String cnhNumero;
    private String cnhCategoria;
    private String cnhVencimento;
    private String passaporteNumero;
    private String certidaoReservistaNumero;
    private String dataNascimento;
    private String nomePai;
    private String nomeMae;
    private String naturalidade;
    private String nacionalidade;
    private String estadoCivil;
    private String profissao;
    private String empresa;
    private String atividadeEconomica;
    private String comentarios;
    private String bancoNome;
    private String bancoAgencia;
    private String bancoConta;
    private String bancoTipo;
    private String chavePix;
    private boolean isFalecido;
    private String detalhesObito;
    private long processos;
    private String advogadoId;
    private String advogadoResponsavel;
    private String initials;
    private String unidadeId;
    private String unidadeNome;
    private boolean ativo;
}
