package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarClienteRequest {

    @NotBlank(message = "Nome e obrigatorio")
    @Size(max = 200)
    private String nome;

    @NotBlank(message = "Tipo e obrigatorio")
    private String tipo;

    @Size(max = 20, message = "CPF/CNPJ deve ter no maximo 20 caracteres")
    private String cpfCnpj;

    private String email;
    private String telefone;

    @NotBlank(message = "Cidade e obrigatoria")
    private String cidade;

    @NotBlank(message = "Estado/UF e obrigatorio")
    private String estado;

    private UUID advogadoId;

    @NotNull(message = "Unidade e obrigatoria")
    private UUID unidadeId;

    @Size(max = 30)
    private String rg;

    @Size(max = 30)
    private String ctps;

    @Size(max = 20)
    private String pis;

    @Size(max = 20)
    private String tituloEleitorNumero;

    @Size(max = 10)
    private String tituloEleitorZona;

    @Size(max = 10)
    private String tituloEleitorSessao;

    @Size(max = 20)
    private String cnhNumero;

    @Size(max = 5)
    private String cnhCategoria;

    private String cnhVencimento;

    @Size(max = 30)
    private String passaporteNumero;

    @Size(max = 30)
    private String certidaoReservistaNumero;

    private String dataNascimento;

    @Size(max = 200)
    private String nomePai;

    @Size(max = 200)
    private String nomeMae;

    @Size(max = 150)
    private String naturalidade;

    @Size(max = 100)
    private String nacionalidade;

    @Size(max = 50)
    private String estadoCivil;

    @Size(max = 100)
    private String profissao;

    @Size(max = 150)
    private String empresa;

    @Size(max = 150)
    private String atividadeEconomica;

    private String comentarios;

    @Size(max = 100)
    private String bancoNome;

    @Size(max = 20)
    private String bancoAgencia;

    @Size(max = 30)
    private String bancoConta;

    @Size(max = 20)
    private String bancoTipo;

    @Size(max = 100)
    private String chavePix;

    private Boolean isFalecido;
    private String detalhesObito;
}
