package com.coimbatore.jewellery.common.dto;

import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.domain.enums.UserRole;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

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
            @NotNull @DecimalMin("0.01") @DecimalMax("20.00") BigDecimal allowedWastagePercent
    ) {}

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
}
