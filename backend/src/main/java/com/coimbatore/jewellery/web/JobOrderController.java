package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.UserRepository;
import com.coimbatore.jewellery.service.JobReconciliationService;
import com.coimbatore.jewellery.service.KarigarWastageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/jobs")
public class JobOrderController {

    private final JobOrderRepository jobRepository;
    private final KarigarRepository karigarRepository;
    private final UserRepository userRepository;
    private final JobReconciliationService reconciliationService;
    private final KarigarWastageService karigarWastageService;

    public JobOrderController(JobOrderRepository jobRepository,
                              KarigarRepository karigarRepository,
                              UserRepository userRepository,
                              JobReconciliationService reconciliationService,
                              KarigarWastageService karigarWastageService) {
        this.jobRepository = jobRepository;
        this.karigarRepository = karigarRepository;
        this.userRepository = userRepository;
        this.reconciliationService = reconciliationService;
        this.karigarWastageService = karigarWastageService;
    }

    @GetMapping
    public ResponseEntity<List<AppDto.JobOrderResponse>> listJobs(@RequestParam(required = false) JobStatus status,
                                                                 @RequestParam(required = false) Long karigarId,
                                                                 Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            // Karigar only sees their own jobs
            if (user.getKarigar() == null) {
                return ResponseEntity.ok(List.of());
            }
            return ResponseEntity.ok(jobRepository.findByKarigarIdOrderByCreatedAtDesc(user.getKarigar().getId())
                    .stream()
                    .map(AppDto.JobOrderResponse::from)
                    .toList());
        }

        if (karigarId != null) {
            return ResponseEntity.ok(jobRepository.findByKarigarIdOrderByCreatedAtDesc(karigarId)
                    .stream()
                    .map(AppDto.JobOrderResponse::from)
                    .toList());
        }

        if (status != null) {
            return ResponseEntity.ok(jobRepository.findByStatusOrderByCreatedAtDesc(status)
                    .stream()
                    .map(AppDto.JobOrderResponse::from)
                    .toList());
        }

        return ResponseEntity.ok(jobRepository.findAll()
                .stream()
                .map(AppDto.JobOrderResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppDto.JobOrderResponse> getJobById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        JobOrder job = jobRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + id));

        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !job.getKarigar().getId().equals(user.getKarigar().getId())) {
                throw new AccessDeniedException("Karigars can only view their own job orders.");
            }
        }

        return ResponseEntity.ok(AppDto.JobOrderResponse.from(job));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.JobOrderResponse> createJob(@Valid @RequestBody AppDto.CreateJobRequest request) {
        Karigar karigar = karigarRepository.findById(request.karigarId())
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + request.karigarId()));

        BigDecimal effectiveWastage = request.allowedWastagePercent();
        if (effectiveWastage == null) {
            effectiveWastage = karigarWastageService.resolveWastagePercent(karigar.getId(), request.itemCategory());
        }

        long nextNum = jobRepository.count() + 1;
        String jobCode = String.format("JOB-2026-%03d", nextNum);
        while (jobRepository.findByJobCode(jobCode).isPresent()) {
            nextNum++;
            jobCode = String.format("JOB-2026-%03d", nextNum);
        }
        JobOrder job = new JobOrder(jobCode, karigar, request.itemCategory(), request.description(), effectiveWastage);
        JobOrder saved = jobRepository.save(job);
        return ResponseEntity.ok(AppDto.JobOrderResponse.from(saved));
    }

    @PostMapping("/{id}/ready-for-reconciliation")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.JobOrderResponse> markReadyForReconciliation(@PathVariable Long id) {
        JobOrder job = reconciliationService.markReadyForReconciliation(id);
        return ResponseEntity.ok(AppDto.JobOrderResponse.from(job));
    }

    @PostMapping("/{id}/reconcile")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.JobOrderResponse> finalizeReconciliation(@PathVariable Long id, Authentication auth) {
        JobOrder job = reconciliationService.finalizeReconciliation(id, auth.getName());
        return ResponseEntity.ok(AppDto.JobOrderResponse.from(job));
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.JobOrderResponse> reopenJob(@PathVariable Long id,
                                                            @Valid @RequestBody AppDto.ReopenJobRequest request,
                                                            Authentication auth) {
        JobOrder job = reconciliationService.reopenReconciledJob(id, request.reason(), auth.getName());
        return ResponseEntity.ok(AppDto.JobOrderResponse.from(job));
    }
}
