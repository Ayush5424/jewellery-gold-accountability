package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.domain.entity.GoldLedgerEntry;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.repository.GoldLedgerEntryRepository;
import com.coimbatore.jewellery.repository.UserRepository;
import com.coimbatore.jewellery.service.GoldLedgerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class GoldLedgerController {

    private final GoldLedgerService ledgerService;
    private final GoldLedgerEntryRepository ledgerRepository;
    private final UserRepository userRepository;

    public GoldLedgerController(GoldLedgerService ledgerService,
                                GoldLedgerEntryRepository ledgerRepository,
                                UserRepository userRepository) {
        this.ledgerService = ledgerService;
        this.ledgerRepository = ledgerRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/issue")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<GoldLedgerEntry> issueGold(@Valid @RequestBody AppDto.IssueGoldRequest request,
                                                     Authentication auth) {
        GoldLedgerEntry entry = ledgerService.recordGoldIssue(
                request.jobId(),
                request.grossWeight(),
                request.purity(),
                request.remarks(),
                request.aiExtracted(),
                request.idempotencyKey(),
                auth.getName()
        );
        return ResponseEntity.ok(entry);
    }

    @PostMapping("/receive")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<GoldLedgerEntry> receiveGold(@Valid @RequestBody AppDto.ReceiveGoldRequest request,
                                                       Authentication auth) {
        GoldLedgerEntry entry = ledgerService.recordGoldReceipt(
                request.jobId(),
                request.transactionType(),
                request.grossWeight(),
                request.purity(),
                request.huid(),
                request.itemDescription(),
                request.remarks(),
                request.aiExtracted(),
                request.idempotencyKey(),
                auth.getName()
        );
        return ResponseEntity.ok(entry);
    }

    @PostMapping("/ledger/reverse")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<GoldLedgerEntry> reverseVoucher(@Valid @RequestBody AppDto.ReverseVoucherRequest request,
                                                          Authentication auth) {
        GoldLedgerEntry reversal = ledgerService.createReversalEntry(request.voucherNumber(), request.reason(), auth.getName());
        return ResponseEntity.ok(reversal);
    }

    @GetMapping("/ledger")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<List<GoldLedgerEntry>> getRecentLedgerEntries() {
        return ResponseEntity.ok(ledgerRepository.findTop50ByOrderByCreatedAtDesc());
    }

    @GetMapping("/ledger/job/{jobId}")
    public ResponseEntity<List<GoldLedgerEntry>> getLedgerByJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(ledgerRepository.findByJobOrderIdOrderByCreatedAtAsc(jobId));
    }

    @GetMapping("/ledger/karigar/{karigarId}")
    public ResponseEntity<List<GoldLedgerEntry>> getLedgerByKarigar(@PathVariable Long karigarId, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !user.getKarigar().getId().equals(karigarId)) {
                throw new AccessDeniedException("Karigars cannot access ledger entries of other karigars.");
            }
        }

        return ResponseEntity.ok(ledgerRepository.findByKarigarIdOrderByCreatedAtDesc(karigarId));
    }
}
