package com.viana.service;

import com.viana.dto.request.CriarPastaInternaRequest;
import com.viana.dto.response.PastaInternaResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Pasta;
import com.viana.model.Unidade;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.PastaRepository;
import com.viana.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PastaService {

    private final PastaRepository pastaRepository;
    private final DocumentoRepository documentoRepository;
    private final UnidadeRepository unidadeRepository;

    @Transactional(readOnly = true)
    public List<PastaInternaResponse> listarInternas(UUID unidadeId, boolean isAdmin) {
        List<Pasta> pastas = pastaRepository.findInternalFolders(isAdmin ? null : unidadeId);
        Map<UUID, PastaInternaResponse> nodes = new LinkedHashMap<>();

        for (Pasta pasta : pastas) {
            nodes.put(pasta.getId(), toNode(pasta));
        }

        List<PastaInternaResponse> roots = new ArrayList<>();
        for (Pasta pasta : pastas) {
            PastaInternaResponse node = nodes.get(pasta.getId());
            UUID parentId = pasta.getParent() != null ? pasta.getParent().getId() : null;

            if (parentId != null && nodes.containsKey(parentId)) {
                nodes.get(parentId).getChildren().add(node);
            } else {
                roots.add(node);
            }
        }

        sortRecursively(roots);
        return roots;
    }

    @Transactional
    public PastaInternaResponse criarInterna(CriarPastaInternaRequest request, UUID unidadeId) {
        if (unidadeId == null) {
            throw new BusinessException("Usuario sem unidade vinculada nao pode criar pasta interna.");
        }

        String nome = request.getNome().trim();
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));

        Pasta parent = null;
        if (request.getParentId() != null) {
            parent = pastaRepository.findByIdAndUnidadeId(request.getParentId(), unidadeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pasta interna nao encontrada"));
            validarPastaInterna(parent);
        }

        validarNomeDuplicado(nome, parent, unidadeId);

        Pasta pasta = Pasta.builder()
                .nome(nome)
                .parent(parent)
                .unidade(unidade)
                .build();

        return toNode(pastaRepository.save(pasta));
    }

    @Transactional
    public void excluirInterna(UUID pastaId, UUID unidadeId, boolean isAdmin) {
        Pasta pasta = buscarPastaInternaAutorizada(pastaId, unidadeId, isAdmin);

        if (pastaRepository.existsByParentId(pasta.getId())) {
            throw new BusinessException("A pasta possui subpastas internas. Exclua-as primeiro.");
        }

        if (documentoRepository.existsByPastaId(pasta.getId())) {
            throw new BusinessException("A pasta possui documentos vinculados. Exclua ou mova os documentos primeiro.");
        }

        pastaRepository.delete(pasta);
    }

    private void validarNomeDuplicado(String nome, Pasta parent, UUID unidadeId) {
        boolean duplicado = parent == null
                ? pastaRepository.existsByParentIsNullAndClienteIsNullAndProcessoIsNullAndUnidadeIdAndNomeIgnoreCase(unidadeId, nome)
                : pastaRepository.existsByParentIdAndClienteIsNullAndProcessoIsNullAndUnidadeIdAndNomeIgnoreCase(parent.getId(), unidadeId, nome);

        if (duplicado) {
            throw new BusinessException("Ja existe uma pasta interna com este nome neste nivel.");
        }
    }

    private void validarPastaInterna(Pasta pasta) {
        if (pasta.getCliente() != null || pasta.getProcesso() != null) {
            throw new BusinessException("Apenas pastas internas podem receber subpastas internas.");
        }
    }

    private Pasta buscarPastaInternaAutorizada(UUID pastaId, UUID unidadeId, boolean isAdmin) {
        Pasta pasta = isAdmin
                ? pastaRepository.findById(pastaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pasta interna nao encontrada"))
                : pastaRepository.findByIdAndUnidadeId(pastaId, unidadeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pasta interna nao encontrada"));

        validarPastaInterna(pasta);
        return pasta;
    }

    private PastaInternaResponse toNode(Pasta pasta) {
        return PastaInternaResponse.builder()
                .id(pasta.getId().toString())
                .nome(pasta.getNome())
                .parentId(pasta.getParent() != null ? pasta.getParent().getId().toString() : null)
                .children(new ArrayList<>())
                .build();
    }

    private void sortRecursively(List<PastaInternaResponse> nodes) {
        nodes.sort(Comparator.comparing(PastaInternaResponse::getNome, String.CASE_INSENSITIVE_ORDER));
        for (PastaInternaResponse node : nodes) {
            sortRecursively(node.getChildren());
        }
    }
}
