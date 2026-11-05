package com.coimbatore.jewellery.common.dto;

import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.domain.enums.AlertType;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.domain.enums.UserRole;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

public class AppDto {

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String token,
            String username,
            String fullName,
            UserRole role,
            Long karigarId
    ) {}

    public record CreateJobRequest(
            @NotNull Long karigarId,
            @NotNull ItemCategory itemCategory,
            @NotBlank String description,
            @DecimalMin("0.01") @DecimalMax("20.00") BigDecimal allowedWastagePercent,
            String overrideReason
    ) {
        public CreateJobRequest(Long karigarId, ItemCategory itemCategory, String description, BigDecimal allowedWastagePercent) {
            this(karigarId, itemCategory, description, allowedWastagePercent, null);
        }
    }

    public record IssueGoldRequest(
            @NotNull Long jobId,
            @NotNull @DecimalMin("0.001") BigDecimal grossWeight,
            @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal purity,
            String remarks,
            boolean aiExtracted,
            String idempotencyKey
    ) {}

    public record ReceiveGoldRequest(
            @NotNull Long jobId,
            @NotNull TransactionType transactionType,
            @NotNull @DecimalMin("0.001") BigDecimal grossWeight,
            @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal purity,
            String huid,
            String itemDescription,
            String remarks,
            boolean aiExtracted,
            String idempotencyKey
    ) {}

    public record ReverseVoucherRequest(
            @NotBlank String voucherNumber,
            @NotBlank String reason
    ) {}

    public record ReviewAlertRequest(
            @NotBlank String status,
            String financeNotes
    ) {}

    public record ReopenJobRequest(
            @NotBlank String reason
    ) {}

    public record KarigarResponse(
            Long id,
            String karigarCode,
            String name,
            String phone,
            String workshopLocation,
            BigDecimal historicalLossAvgPct,
            Integer completedJobsCount,
            boolean active,
            String username,
            Instant createdAt
    ) {
        public Long getId() { return id; }
        public String getKarigarCode() { return karigarCode; }
        public String getName() { return name; }
        public String getPhone() { return phone; }
        public String getWorkshopLocation() { return workshopLocation; }
        public BigDecimal getHistoricalLossAvgPct() { return historicalLossAvgPct; }
        public Integer getCompletedJobsCount() { return completedJobsCount; }
        public boolean isActive() { return active; }
        public String getUsername() { return username; }
        public Instant getCreatedAt() { return createdAt; }

        public static KarigarResponse from(com.coimbatore.jewellery.domain.entity.Karigar k) {
            if (k == null) return null;
            return new KarigarResponse(
                    k.getId(),
                    k.getKarigarCode(),
                    k.getName(),
                    k.getPhone(),
                    k.getWorkshopLocation(),
                    k.getHistoricalLossAvgPct(),
                    k.getCompletedJobsCount(),
                    k.isActive(),
                    k.getUsername(),
                    k.getCreatedAt()
            );
        }
    }

    public record JobOrderResponse(
            Long id,
            String jobCode,
            KarigarResponse karigar,
            ItemCategory itemCategory,
            String description,
            JobStatus status,
            BigDecimal allowedWastagePercent,
            BigDecimal issuedFineWeight,
            BigDecimal recoveredFineWeight,
            BigDecimal outstandingFineWeight,
            BigDecimal actualLoss,
            BigDecimal excessLoss,
            BigDecimal actualLossPct,
            Instant reconciledAt,
            String reconciledBy,
            Instant createdAt
    ) {
        public Long getId() { return id; }
        public String getJobCode() { return jobCode; }
        public KarigarResponse getKarigar() { return karigar; }
        public ItemCategory getItemCategory() { return itemCategory; }
        public String getDescription() { return description; }
        public JobStatus getStatus() { return status; }
        public BigDecimal getAllowedWastagePercent() { return allowedWastagePercent; }
        public BigDecimal getIssuedFineWeight() { return issuedFineWeight; }
        public BigDecimal getRecoveredFineWeight() { return recoveredFineWeight; }
        public BigDecimal getOutstandingFineWeight() { return outstandingFineWeight; }
        public BigDecimal getActualLoss() { return actualLoss; }
        public BigDecimal getExcessLoss() { return excessLoss; }
        public BigDecimal getActualLossPct() { return actualLossPct; }
        public Instant getReconciledAt() { return reconciledAt; }
        public String getReconciledBy() { return reconciledBy; }
        public Instant getCreatedAt() { return createdAt; }

        public static JobOrderResponse from(com.coimbatore.jewellery.domain.entity.JobOrder j) {
            if (j == null) return null;
            return new JobOrderResponse(
                    j.getId(),
                    j.getJobCode(),
                    KarigarResponse.from(j.getKarigar()),
                    j.getItemCategory(),
                    j.getDescription(),
                    j.getStatus(),
                    j.getAllowedWastagePercent(),
                    j.getIssuedFineWeight(),
                    j.getRecoveredFineWeight(),
                    j.getOutstandingFineWeight(),
                    j.getActualLoss(),
                    j.getExcessLoss(),
                    j.getActualLossPct(),
                    j.getReconciledAt(),
                    j.getReconciledBy(),
                    j.getCreatedAt()
            );
        }
    }

    public record GoldLedgerEntryResponse(
            Long id,
            String voucherNumber,
            TransactionType transactionType,
            JobOrderResponse jobOrder,
            KarigarResponse karigar,
            BigDecimal grossWeight,
            BigDecimal purity,
            BigDecimal fineWeight,
            String huid,
            String itemDescription,
            String remarks,
            boolean isReversal,
            String reversalOfVoucher,
            boolean aiExtracted,
            String idempotencyKey,
            String createdBy,
            Instant createdAt
    ) {
        public Long getId() { return id; }
        public String getVoucherNumber() { return voucherNumber; }
        public TransactionType getTransactionType() { return transactionType; }
        public JobOrderResponse getJobOrder() { return jobOrder; }
        public KarigarResponse getKarigar() { return karigar; }
        public BigDecimal getGrossWeight() { return grossWeight; }
        public BigDecimal getPurity() { return purity; }
        public BigDecimal getFineWeight() { return fineWeight; }
        public String getHuid() { return huid; }
        public String getItemDescription() { return itemDescription; }
        public String getRemarks() { return remarks; }
        public boolean isReversal() { return isReversal; }
        public String getReversalOfVoucher() { return reversalOfVoucher; }
        public boolean isAiExtracted() { return aiExtracted; }
        public String getIdempotencyKey() { return idempotencyKey; }
        public String getCreatedBy() { return createdBy; }
        public Instant getCreatedAt() { return createdAt; }

        public static GoldLedgerEntryResponse from(com.coimbatore.jewellery.domain.entity.GoldLedgerEntry e) {
            if (e == null) return null;
            return new GoldLedgerEntryResponse(
                    e.getId(),
                    e.getVoucherNumber(),
                    e.getTransactionType(),
                    JobOrderResponse.from(e.getJobOrder()),
                    KarigarResponse.from(e.getKarigar()),
                    e.getGrossWeight(),
                    e.getPurity(),
                    e.getFineWeight(),
                    e.getHuid(),
                    e.getItemDescription(),
                    e.getRemarks(),
                    e.isReversal(),
                    e.getReversalOfVoucher(),
                    e.isAiExtracted(),
                    e.getIdempotencyKey(),
                    e.getCreatedBy(),
                    e.getCreatedAt()
            );
        }
    }

    public record LossAlertResponse(
            Long id,
            JobOrderResponse jobOrder,
            KarigarResponse karigar,
            AlertType alertType,
            BigDecimal actualLoss,
            BigDecimal allowedLoss,
            BigDecimal excessLoss,
            BigDecimal actualLossPct,
            BigDecimal allowedLossPct,
            BigDecimal historicalBaselinePct,
            String reason,
            AlertStatus status,
            String financeNotes,
            String reviewedBy,
            Instant reviewedAt,
            Instant createdAt
    ) {
        public static LossAlertResponse from(com.coimbatore.jewellery.domain.entity.LossAlert a) {
            if (a == null) return null;
            return new LossAlertResponse(
                    a.getId(),
                    JobOrderResponse.from(a.getJobOrder()),
                    KarigarResponse.from(a.getKarigar()),
                    a.getAlertType(),
                    a.getActualLoss(),
                    a.getAllowedLoss(),
                    a.getExcessLoss(),
                    a.getActualLossPct(),
                    a.getAllowedLossPct(),
                    a.getHistoricalBaselinePct(),
                    a.getReason(),
                    a.getStatus(),
                    a.getFinanceNotes(),
                    a.getReviewedBy(),
                    a.getReviewedAt(),
                    a.getCreatedAt()
            );
        }
    }

    public record UpdateWastageAllowanceRequest(
            @NotNull ItemCategory itemCategory,
            @NotNull @DecimalMin("0.01") @DecimalMax("20.00") BigDecimal allowedWastagePercent
    ) {}

    public record KarigarWastageAllowanceResponse(
            Long id,
            Long karigarId,
            String karigarCode,
            String karigarName,
            ItemCategory itemCategory,
            BigDecimal allowedWastagePercent,
            String updatedBy,
            Instant updatedAt
    ) {
        public static KarigarWastageAllowanceResponse from(com.coimbatore.jewellery.domain.entity.KarigarWastageAllowance a) {
            if (a == null) return null;
            return new KarigarWastageAllowanceResponse(
                    a.getId(),
                    a.getKarigar() != null ? a.getKarigar().getId() : null,
                    a.getKarigar() != null ? a.getKarigar().getKarigarCode() : null,
                    a.getKarigar() != null ? a.getKarigar().getName() : null,
                    a.getItemCategory(),
                    a.getAllowedWastagePercent(),
                    a.getUpdatedBy(),
                    a.getUpdatedAt()
            );
        }
        public Long getId() { return id; }
        public Long getKarigarId() { return karigarId; }
        public String getKarigarCode() { return karigarCode; }
        public String getKarigarName() { return karigarName; }
        public ItemCategory getItemCategory() { return itemCategory; }
        public BigDecimal getAllowedWastagePercent() { return allowedWastagePercent; }
        public String getUpdatedBy() { return updatedBy; }
        public Instant getUpdatedAt() { return updatedAt; }
    }
}
