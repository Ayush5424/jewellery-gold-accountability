package com.coimbatore.jewellery;

import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.service.KarigarWastageService;
import com.coimbatore.jewellery.service.GoldLedgerService;
import com.coimbatore.jewellery.service.JobReconciliationService;
import com.coimbatore.jewellery.service.VoucherGeneratorService;
import com.coimbatore.jewellery.support.InMemoryRepositories.*;
import com.coimbatore.jewellery.web.GoldLedgerController;
import com.coimbatore.jewellery.web.JobOrderController;
import com.coimbatore.jewellery.web.KarigarController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KarigarSecurityIsolationTest {

    private InMemoryKarigarRepository karigarRepo;
    private InMemoryUserRepository userRepo;
    private InMemoryJobOrderRepository jobRepo;
    private InMemoryGoldLedgerEntryRepository ledgerRepo;
    private InMemoryLossAlertRepository alertRepo;

    private KarigarController karigarController;
    private JobOrderController jobController;
    private GoldLedgerController ledgerController;

    private Karigar murugesan;
    private Karigar sivakumar;
    private User murugesanUser;
    private User financeUser;
    private JobOrder sivaJob;

    @BeforeEach
    void setUp() {
        karigarRepo = new InMemoryKarigarRepository();
        userRepo = new InMemoryUserRepository();
        jobRepo = new InMemoryJobOrderRepository();
        ledgerRepo = new InMemoryGoldLedgerEntryRepository();
        alertRepo = new InMemoryLossAlertRepository();

        VoucherGeneratorService voucherGenerator = new VoucherGeneratorService();
        GoldLedgerService ledgerService = new GoldLedgerService(ledgerRepo, jobRepo, karigarRepo, voucherGenerator);
        JobReconciliationService reconciliationService = new JobReconciliationService(jobRepo, karigarRepo, alertRepo, ledgerService);
        InMemoryKarigarWastageAllowanceRepository allowanceRepo = new InMemoryKarigarWastageAllowanceRepository();
        KarigarWastageService wastageService = new KarigarWastageService(allowanceRepo, karigarRepo);

        karigarController = new KarigarController(karigarRepo, userRepo, wastageService);
        jobController = new JobOrderController(jobRepo, karigarRepo, userRepo, reconciliationService, wastageService);
        ledgerController = new GoldLedgerController(ledgerService, ledgerRepo, userRepo, jobRepo);

        murugesan = karigarRepo.save(new Karigar("KRG-001", "Murugesan S", "+91 98422 10001", "Workshop", "murugesan"));
        sivakumar = karigarRepo.save(new Karigar("KRG-002", "Sivakumar P", "+91 98422 10002", "Workshop", "sivakumar"));

        murugesanUser = userRepo.save(new User("murugesan", "hash", "Murugesan S", UserRole.ROLE_KARIGAR, murugesan));
        financeUser = userRepo.save(new User("finance_head", "hash", "Finance Officer", UserRole.ROLE_FINANCE_HEAD, null));

        sivaJob = jobRepo.save(new JobOrder("JOB-2026-002", sivakumar, ItemCategory.RING, "Rings", new BigDecimal("1.00")));
    }

    @Test
    @DisplayName("Karigar can view their own profile, but is forbidden from viewing peer karigar profile")
    void testKarigarProfileIsolation() {
        Authentication murugesanAuth = new UsernamePasswordAuthenticationToken("murugesan", null, Collections.emptyList());

        // Can view own profile
        assertThat(karigarController.getKarigarById(murugesan.getId(), murugesanAuth).getBody().getKarigarCode()).isEqualTo("KRG-001");

        // Changing ID in URL to view peer karigar throws 403 AccessDeniedException
        assertThatThrownBy(() -> karigarController.getKarigarById(sivakumar.getId(), murugesanAuth))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Karigars are strictly prohibited from viewing peer accounts");
    }

    @Test
    @DisplayName("Karigar cannot view peer job order by tampering URL job ID")
    void testKarigarJobIsolation() {
        Authentication murugesanAuth = new UsernamePasswordAuthenticationToken("murugesan", null, Collections.emptyList());

        assertThatThrownBy(() -> jobController.getJobById(sivaJob.getId(), murugesanAuth))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Karigars can only view their own job orders");
    }

    @Test
    @DisplayName("Karigar cannot view peer ledger entries by tampering karigar ID in URL")
    void testKarigarLedgerIsolation() {
        Authentication murugesanAuth = new UsernamePasswordAuthenticationToken("murugesan", null, Collections.emptyList());

        assertThatThrownBy(() -> ledgerController.getLedgerByKarigar(sivakumar.getId(), murugesanAuth))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Karigars cannot access ledger entries of other karigars");
    }

    @Test
    @DisplayName("Karigar cannot view peer job ledger entries by tampering job ID in URL")
    void testKarigarJobLedgerIsolation() {
        Authentication murugesanAuth = new UsernamePasswordAuthenticationToken("murugesan", null, Collections.emptyList());

        assertThatThrownBy(() -> ledgerController.getLedgerByJob(sivaJob.getId(), murugesanAuth))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Karigars can only view ledger entries of their own assigned jobs");
    }

    @Test
    @DisplayName("Finance Head has unrestricted administrative access to all karigars and jobs")
    void testFinanceHeadUnrestrictedAccess() {
        Authentication financeAuth = new UsernamePasswordAuthenticationToken("finance_head", null, Collections.emptyList());

        assertThat(karigarController.getKarigarById(murugesan.getId(), financeAuth).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(karigarController.getKarigarById(sivakumar.getId(), financeAuth).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(jobController.getJobById(sivaJob.getId(), financeAuth).getStatusCode().is2xxSuccessful()).isTrue();
    }
}
