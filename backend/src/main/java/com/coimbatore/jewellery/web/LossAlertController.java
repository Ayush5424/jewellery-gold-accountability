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
    public ResponseEntity<List<LossAlert>> listAlerts(@RequestParam(required = false) AlertStatus status) {
        if (status != null) {
            return ResponseEntity.ok(alertRepository.findByStatusOrderByCreatedAtDesc(status));
        }
        return ResponseEntity.ok(alertRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<LossAlert> reviewAlert(@PathVariable Long id,
                                                 @Valid @RequestBody AppDto.ReviewAlertRequest request,
                                                 Authentication auth) {
        LossAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found: " + id));

        alert.setStatus(AlertStatus.valueOf(request.status()));
        alert.setFinanceNotes(request.financeNotes());
        alert.setReviewedBy(auth.getName());
        alert.setReviewedAt(Instant.now());

        return ResponseEntity.ok(alertRepository.save(alert));
    }
}
