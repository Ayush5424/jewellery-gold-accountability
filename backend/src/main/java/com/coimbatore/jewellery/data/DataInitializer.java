package com.coimbatore.jewellery.data;

import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.UserRepository;
import com.coimbatore.jewellery.service.GoldLedgerService;
import com.coimbatore.jewellery.service.JobReconciliationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final KarigarRepository karigarRepository;
    private final JobOrderRepository jobRepository;
    private final GoldLedgerService ledgerService;
    private final JobReconciliationService reconciliationService;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           KarigarRepository karigarRepository,
                           JobOrderRepository jobRepository,
                           GoldLedgerService ledgerService,
                           JobReconciliationService reconciliationService,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.karigarRepository = karigarRepository;
        this.jobRepository = jobRepository;
        this.ledgerService = ledgerService;
        this.reconciliationService = reconciliationService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (karigarRepository.count() > 0) {
            return; // Data already seeded
        }

        // 1. Seed Karigars across Coimbatore Showrooms & Workshop
        Karigar murugesan = karigarRepository.save(new Karigar("KRG-001", "Murugesan S", "+91 98422 10001", "Central Workshop - Bench 1", "murugesan"));
        murugesan.setHistoricalLossAvgPct(new BigDecimal("0.08"));
        murugesan.setCompletedJobsCount(6);
        murugesan = karigarRepository.save(murugesan);

        Karigar sivakumar = karigarRepository.save(new Karigar("KRG-002", "Sivakumar P", "+91 98422 10002", "Central Workshop - Bench 2", "sivakumar"));
        sivakumar.setHistoricalLossAvgPct(new BigDecimal("0.09"));
        sivakumar.setCompletedJobsCount(7);
        sivakumar = karigarRepository.save(sivakumar);

        Karigar marimuthu = karigarRepository.save(new Karigar("KRG-003", "Marimuthu N", "+91 98422 10003", "Central Workshop - Casting Unit", "marimuthu"));
        karigarRepository.save(new Karigar("KRG-004", "Dhandapani G", "+91 98422 10004", "RS Puram Showroom Unit", "dhandapani"));
        karigarRepository.save(new Karigar("KRG-005", "Palanisamy K", "+91 98422 10005", "Cross Cut Road Showroom Unit", "palanisamy"));
        karigarRepository.save(new Karigar("KRG-006", "Velusamy A", "+91 98422 10006", "Gandhipuram Showroom Unit", "velusamy"));
        karigarRepository.save(new Karigar("KRG-007", "Kuppusamy V", "+91 98422 10007", "Town Hall Showroom Unit", "kuppusamy"));
        karigarRepository.save(new Karigar("KRG-008", "Shanmugam T", "+91 98422 10008", "Peelamedu Showroom Unit", "shanmugam"));

        // 2. Seed Users
        userRepository.save(new User("finance_head", passwordEncoder.encode("finance123"), "Saravanan R (Finance Head)", UserRole.ROLE_FINANCE_HEAD, null));
        userRepository.save(new User("issue_clerk", passwordEncoder.encode("clerk123"), "Ramalingam K (Issue Clerk)", UserRole.ROLE_ISSUE_CLERK, null));
        userRepository.save(new User("murugesan", passwordEncoder.encode("karigar123"), "Murugesan S (Master Karigar)", UserRole.ROLE_KARIGAR, murugesan));
        userRepository.save(new User("sivakumar", passwordEncoder.encode("karigar123"), "Sivakumar P (Karigar)", UserRole.ROLE_KARIGAR, sivakumar));
        userRepository.save(new User("marimuthu", passwordEncoder.encode("karigar123"), "Marimuthu N (Karigar)", UserRole.ROLE_KARIGAR, marimuthu));

        // 3. Murugesan S Benchmark Job (Active in interim state matching assessment prompt)
        JobOrder murugesanJob = jobRepository.save(new JobOrder("JOB-2026-001", murugesan, ItemCategory.CHAIN, "916 Hallmarked Traditional Coimbatore Rope Chain", new BigDecimal("1.20")));
        ledgerService.recordGoldIssue(murugesanJob.getId(), new BigDecimal("120.000"), new BigDecimal("91.60"), "24kt standard bullion bar issued", false, "seed-issue-001", "issue_clerk");
        ledgerService.recordGoldReceipt(murugesanJob.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("112.450"), new BigDecimal("91.60"), "HUID916C01", "Finished 916 Hallmarked Rope Chain", "Showroom stock delivery", false, "seed-rcpt-001", "issue_clerk");
        ledgerService.recordGoldReceipt(murugesanJob.getId(), TransactionType.RECEIPT_SCRAP, new BigDecimal("3.300"), new BigDecimal("91.60"), null, "Cutting and sizing scrap", "Clean scrap returned", false, "seed-rcpt-002", "issue_clerk");

        // 4. Sivakumar P Job: Excessive loss scenario triggering review alert
        JobOrder sivaJob = jobRepository.save(new JobOrder("JOB-2026-002", sivakumar, ItemCategory.RING, "Signet Rings (Set of 6)", new BigDecimal("1.00")));
        ledgerService.recordGoldIssue(sivaJob.getId(), new BigDecimal("80.000"), new BigDecimal("91.60"), "Gold bar issued", false, "seed-issue-002", "issue_clerk");
        ledgerService.recordGoldReceipt(sivaJob.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("74.500"), new BigDecimal("91.60"), "HUID916R01", "Finished signet rings", "Delivered", false, "seed-rcpt-003", "issue_clerk");
        ledgerService.recordGoldReceipt(sivaJob.getId(), TransactionType.RECEIPT_SCRAP, new BigDecimal("2.000"), new BigDecimal("91.60"), null, "Ring scrap", "Returned", false, "seed-rcpt-004", "issue_clerk");
        ledgerService.recordGoldReceipt(sivaJob.getId(), TransactionType.RECEIPT_FILINGS, new BigDecimal("0.800"), new BigDecimal("91.60"), null, "Bench dust filings", "Returned", false, "seed-rcpt-005", "issue_clerk");
        reconciliationService.markReadyForReconciliation(sivaJob.getId());
        reconciliationService.finalizeReconciliation(sivaJob.getId(), "finance_head");

        // 5. Marimuthu N Job: In-progress temple necklace job
        JobOrder marimuthuJob = jobRepository.save(new JobOrder("JOB-2026-003", marimuthu, ItemCategory.TEMPLE_JEWELLERY, "Antique Temple Choker Necklace", new BigDecimal("1.80")));
        ledgerService.recordGoldIssue(marimuthuJob.getId(), new BigDecimal("150.000"), new BigDecimal("91.60"), "Fine gold for temple jewellery", false, "seed-issue-003", "issue_clerk");
        ledgerService.recordGoldReceipt(marimuthuJob.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("120.000"), new BigDecimal("91.60"), "HUID916T01", "Choker center piece completed", "Interim delivery", false, "seed-rcpt-006", "issue_clerk");
    }
}
