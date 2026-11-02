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
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jobs")
public class JobOrderController {

    private final JobOrderRepository jobRepository;
    private final KarigarRepository karigarRepository;
    private final UserRepository userRepository;
    private final JobReconciliationService reconciliationService;

    public JobOrderController(JobOrderRepository jobRepository,
                              KarigarRepository karigarRepository,
                              UserRepository userRepository,
                              JobReconciliationService reconciliationService) {
        this.jobRepository = jobRepository;
        this.karigarRepository = karigarRepository;
        this.userRepository = userRepository;
        this.reconciliationService = reconciliationService;
    }

    @GetMapping
    public ResponseEntity<List<JobOrder>> listJobs(@RequestParam(required = false) JobStatus status,
                                                   @RequestParam(required = false) Long karigarId,
                                                   Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            // Karigar only sees their own jobs
            if (user.getKarigar() == null) {
                return ResponseEntity.ok(List.of());
            }
            return ResponseEntity.ok(jobRepository.findByKarigarIdOrderByCreatedAtDesc(user.getKarigar().getId()));
        }

        if (karigarId != null) {
            return ResponseEntity.ok(jobRepository.findByKarigarIdOrderByCreatedAtDesc(karigarId));
        }

        if (status != null) {
            return ResponseEntity.ok(jobRepository.findByStatusOrderByCreatedAtDesc(status));
        }

        return ResponseEntity.ok(jobRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobOrder> getJobById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        JobOrder job = jobRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + id));

        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !job.getKarigar().getId().equals(user.getKarigar().getId())) {
                throw new AccessDeniedException("Karigars can only view their own job orders.");
            }
        }

        return ResponseEntity.ok(job);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<JobOrder> createJob(@Valid @RequestBody AppDto.CreateJobRequest request) {
        Karigar karigar = karigarRepository.findById(request.karigarId())
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + request.karigarId()));

        String jobCode = String.format("JOB-2026-%04d", jobRepository.count() + 1);
        JobOrder job = new JobOrder(jobCode, karigar, request.itemCategory(), request.description(), request.allowedWastagePercent());
        return ResponseEntity.ok(jobRepository.save(job));
    }

    @PostMapping("/{id}/ready-for-reconciliation")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<JobOrder> markReadyForReconciliation(@PathVariable Long id) {
        return ResponseEntity.ok(reconciliationService.markReadyForReconciliation(id));
    }

    @PostMapping("/{id}/reconcile")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<JobOrder> finalizeReconciliation(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(reconciliationService.finalizeReconciliation(id, auth.getName()));
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<JobOrder> reopenJob(@PathVariable Long id,
                                              @Valid @RequestBody AppDto.ReopenJobRequest request,
                                              Authentication auth) {
        return ResponseEntity.ok(reconciliationService.reopenReconciledJob(id, request.reason(), auth.getName()));
    }
}
