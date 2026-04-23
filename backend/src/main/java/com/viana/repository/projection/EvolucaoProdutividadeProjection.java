package com.viana.repository.projection;

import java.time.LocalDate;

public interface EvolucaoProdutividadeProjection {
    LocalDate getPeriodo();
    Long getTarefasConcluidas();
}
