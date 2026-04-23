package com.viana.controller;

import com.viana.dto.response.EvolucaoProdutividadeDTO;
import com.viana.dto.response.IndicadorResponsavelDTO;
import com.viana.service.IndicadoresEquipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/indicadores/equipe")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class IndicadoresEquipeController {

    private final IndicadoresEquipeService indicadoresEquipeService;

    @GetMapping
    public ResponseEntity<List<IndicadorResponsavelDTO>> listarVisaoGlobal(
            @RequestParam(required = false) String periodo
    ) {
        return ResponseEntity.ok(indicadoresEquipeService.listarVisaoGlobal(periodo));
    }

    @GetMapping("/{usuarioId}/evolucao")
    public ResponseEntity<List<EvolucaoProdutividadeDTO>> listarEvolucao(
            @PathVariable UUID usuarioId,
            @RequestParam(required = false) String periodo
    ) {
        return ResponseEntity.ok(indicadoresEquipeService.listarEvolucao(usuarioId, periodo));
    }
}
