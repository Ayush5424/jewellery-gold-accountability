package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.common.exception.BusinessValidationException;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.KarigarWastageAllowance;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.support.InMemoryRepositories;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Karigar Wastage Allowance Matrix Service Tests")
class KarigarWastageServiceTest {

    private InMemoryRepositories.InMemoryKarigarRepository karigarRepo;
    private InMemoryRepositories.InMemoryKarigarWastageAllowanceRepository allowanceRepo;
    private KarigarWastageService service;
    private Karigar testKarigar;

    @BeforeEach
    void setUp() {
        karigarRepo = new InMemoryRepositories.InMemoryKarigarRepository();
        allowanceRepo = new InMemoryRepositories.InMemoryKarigarWastageAllowanceRepository();
        service = new KarigarWastageService(allowanceRepo, karigarRepo);

        testKarigar = karigarRepo.save(new Karigar("KRG-001", "Murugesan S", "+91 98422 10001", "Central Workshop", "murugesan"));
    }

    @Test
    @DisplayName("Should return workshop defaults when no custom matrix exists")
    void shouldReturnWorkshopDefaults() {
        List<KarigarWastageAllowance> list = service.getAllowancesForKarigar(testKarigar.getId());
        assertEquals(ItemCategory.values().length, list.size());

        BigDecimal chainAllowance = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.CHAIN);
        assertEquals(new BigDecimal("1.20"), chainAllowance);

        BigDecimal banglesAllowance = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.BANGLES);
        assertEquals(new BigDecimal("1.50"), banglesAllowance);

        BigDecimal ringAllowance = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.RING);
        assertEquals(new BigDecimal("1.00"), ringAllowance);
    }

    @Test
    @DisplayName("Should allow Finance Head to update category allowance with audit trail")
    void shouldUpdateAllowanceWithAuditTrail() {
        KarigarWastageAllowance updated = service.updateAllowance(
                testKarigar.getId(), ItemCategory.CHAIN, new BigDecimal("1.35"), "finance_head");

        assertNotNull(updated.getId());
        assertEquals(new BigDecimal("1.35"), updated.getAllowedWastagePercent());
        assertEquals("finance_head", updated.getUpdatedBy());
        assertNotNull(updated.getUpdatedAt());

        BigDecimal resolved = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.CHAIN);
        assertEquals(new BigDecimal("1.35"), resolved);
    }

    @Test
    @DisplayName("Should reject invalid wastage allowances below 0.01% or above 20.00%")
    void shouldRejectInvalidWastageAllowances() {
        assertThrows(BusinessValidationException.class, () ->
                service.updateAllowance(testKarigar.getId(), ItemCategory.CHAIN, new BigDecimal("0.00"), "finance_head"));

        assertThrows(BusinessValidationException.class, () ->
                service.updateAllowance(testKarigar.getId(), ItemCategory.CHAIN, new BigDecimal("-0.50"), "finance_head"));

        assertThrows(BusinessValidationException.class, () ->
                service.updateAllowance(testKarigar.getId(), ItemCategory.CHAIN, new BigDecimal("20.01"), "finance_head"));

        assertThrows(BusinessValidationException.class, () ->
                service.updateAllowance(testKarigar.getId(), ItemCategory.CHAIN, null, "finance_head"));
    }

    @Test
    @DisplayName("Should seed default allowances across all categories")
    void shouldSeedDefaultAllowances() {
        service.seedDefaultsForKarigar(testKarigar, "SYSTEM_INIT");
        List<KarigarWastageAllowance> persisted = allowanceRepo.findByKarigarId(testKarigar.getId());
        assertEquals(ItemCategory.values().length, persisted.size());
    }

    @Test
    @DisplayName("Should snapshot allowance into JobOrder; future master matrix updates must not alter historical job orders")
    void shouldSnapshotAllowanceAndPreserveHistoricalJobs() {
        BigDecimal initialWastage = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.CHAIN);
        assertEquals(new BigDecimal("1.20"), initialWastage);

        // Create job order snapshotting 1.20%
        JobOrder historicalJob = new JobOrder("JOB-2026-0001", testKarigar, ItemCategory.CHAIN, "Rope Chain", initialWastage);
        assertEquals(new BigDecimal("1.20"), historicalJob.getAllowedWastagePercent());

        // Master matrix is subsequently updated by Finance Head to 1.45%
        service.updateAllowance(testKarigar.getId(), ItemCategory.CHAIN, new BigDecimal("1.45"), "finance_head");
        BigDecimal newMasterAllowance = service.resolveWastagePercent(testKarigar.getId(), ItemCategory.CHAIN);
        assertEquals(new BigDecimal("1.45"), newMasterAllowance);

        // Historical job order must retain 1.20% permanently
        assertEquals(new BigDecimal("1.20"), historicalJob.getAllowedWastagePercent(),
                "Historical JobOrder wastage must remain unchanged after master allowance update");
    }
}
