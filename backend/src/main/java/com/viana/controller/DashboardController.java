package com.viana.controller;

import com.viana.dto.response.ProcessoResponse;
import com.viana.repository.*;
import com.viana.model.enums.StatusProcesso;
import com.viana.service.ProcessoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final PrazoRepository prazoRepository;
    private final ProcessoService processoService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard() {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate fimSemana = hoje.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long totalClientes = clienteRepository.countByAtivoTrue();
        long processosAtivos = processoRepository.countByStatusIn(
                List.of(StatusProcesso.EM_ANDAMENTO, StatusProcesso.URGENTE, StatusProcesso.AGUARDANDO));
        long prazosSemana = prazoRepository.countByConcluidoFalseAndDataBetween(inicioSemana, fimSemana);

        List<ProcessoResponse> processosRecentes = processoService.listarRecentes(5);

        return ResponseEntity.ok(Map.of(
                "totalClientes", totalClientes,
                "processosAtivos", processosAtivos,
                "prazosSemana", prazosSemana,
                "proximosPrazos", prazoRepository.findTop5ByConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(hoje),
                "processosRecentes", processosRecentes
        ));
    }
}
