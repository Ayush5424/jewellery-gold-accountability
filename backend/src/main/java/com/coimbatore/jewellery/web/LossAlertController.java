package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.domain.entity.LossAlert;
import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.repository.LossAlertRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/alerts")
@PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
public class LossAlertController {

    private final LossAlertRepository alertRepository;

    public LossAlertController(LossAlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    @GetMapping
    public ResponseEntity<List<AppDto.LossAlertResponse>> listAlerts(@RequestParam(required = false) AlertStatus status) {
        List<LossAlert> alerts = (status != null)
                ? alertRepository.findByStatusOrderByCreatedAtDesc(status)
                : alertRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(alerts.stream().map(AppDto.LossAlertResponse::from).toList());
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<AppDto.LossAlertResponse> reviewAlert(@PathVariable Long id,
                                                               @Valid @RequestBody AppDto.ReviewAlertRequest request,
                                                               Authentication auth) {
        LossAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found: " + id));

        alert.setStatus(AlertStatus.valueOf(request.status()));
        alert.setFinanceNotes(request.financeNotes());
        alert.setReviewedBy(auth.getName());
        alert.setReviewedAt(Instant.now());

        LossAlert saved = alertRepository.save(alert);
        return ResponseEntity.ok(AppDto.LossAlertResponse.from(saved));
    }
}
