package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PastaInternaResponse {
    private String id;
    private String nome;
    private String parentId;

    @Builder.Default
    private List<PastaInternaResponse> children = new ArrayList<>();
}
