package com.viana.service;

import com.viana.dto.response.UnidadeResponse;
import com.viana.model.Unidade;
import com.viana.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UnidadeService {

    private final UnidadeRepository unidadeRepository;

    @Transactional(readOnly = true)
    public List<UnidadeResponse> listarTodas() {
        return unidadeRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private UnidadeResponse toResponse(Unidade u) {
        return UnidadeResponse.builder()
                .id(u.getId().toString())
                .nome(u.getNome())
                .cidade(u.getCidade())
                .estado(u.getEstado())
                .build();
    }
}
