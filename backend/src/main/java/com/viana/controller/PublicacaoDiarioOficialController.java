package com.viana.controller;

import com.viana.dto.response.PublicacaoDiarioOficialResponse;
import com.viana.service.PublicacaoDiarioOficialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/publicacoes/diarios-oficiais")
@RequiredArgsConstructor
public class PublicacaoDiarioOficialController {

    private final PublicacaoDiarioOficialService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<List<PublicacaoDiarioOficialResponse>> listar(
            @RequestParam(required = false, defaultValue = "true") Boolean apenasSemScraping,
            @RequestParam(required = false) String uf
    ) {
        return ResponseEntity.ok(service.listar(apenasSemScraping, uf));
    }
}
