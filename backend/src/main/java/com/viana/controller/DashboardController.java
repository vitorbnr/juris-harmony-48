package com.viana.controller;

import com.viana.dto.response.ProcessoResponse;
import com.viana.model.Usuario;
import com.viana.repository.*;
import com.viana.model.enums.StatusProcesso;
import com.viana.service.ProcessoService;
import com.viana.service.PrazoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final PrazoRepository prazoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProcessoService processoService;
    private final PrazoService prazoService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard(Authentication authentication) {
        UUID usuarioId = getUsuarioId(authentication);
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate fimSemana = hoje.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

    
        long totalClientes = clienteRepository.countByAtivoTrue();
        long processosAtivos = processoRepository.countByStatusInExcluindoAtendimentoSintetico(
                List.of(StatusProcesso.EM_ANDAMENTO, StatusProcesso.URGENTE, StatusProcesso.AGUARDANDO));
        
        long prazosSemana = prazoRepository.countByAdvogadoIdAndConcluidoFalseAndDataBetween(usuarioId, inicioSemana, fimSemana);
        long prazosAtrasados = prazoService.contarAtrasados(usuarioId);
        long prazosHoje = prazoService.contarVencendoHoje(usuarioId);
        long tarefasAbertas = prazoService.contarTarefasAbertas(usuarioId);

        List<ProcessoResponse> processosRecentes = processoService.listarRecentes(5);

        return ResponseEntity.ok(Map.of(
                "totalClientes", totalClientes,
                "processosAtivos", processosAtivos,
                "prazosSemana", prazosSemana,
                "prazosAtrasados", prazosAtrasados,
                "prazosHoje", prazosHoje,
                "tarefasAbertas", tarefasAbertas,
                "proximosPrazos", prazoService.listarProximos(usuarioId, 5),
                "processosRecentes", processosRecentes
        ));
    }

    private UUID getUsuarioId(Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return usuario.getId();
    }
}
