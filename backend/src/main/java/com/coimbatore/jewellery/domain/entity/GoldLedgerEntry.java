package com.coimbatore.jewellery.domain.entity;

import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "gold_ledger_entry", indexes = {
    @Index(name = "idx_ledger_voucher", columnList = "voucher_number", unique = true),
    @Index(name = "idx_ledger_job", columnList = "job_order_id"),
    @Index(name = "idx_ledger_karigar", columnList = "karigar_id"),
    @Index(name = "idx_ledger_type", columnList = "transaction_type"),
    @Index(name = "idx_ledger_created_at", columnList = "created_at"),
    @Index(name = "idx_ledger_idempotency", columnList = "idempotency_key", unique = true)
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GoldLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_number", nullable = false, unique = true, length = 32)
    private String voucherNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 32)
    private TransactionType transactionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_order_id")
    private JobOrder jobOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "karigar_id", nullable = false)
    private Karigar karigar;

    @Column(name = "gross_weight", nullable = false, precision = 12, scale = 3)
    private BigDecimal grossWeight;

    @Column(name = "purity", nullable = false, precision = 5, scale = 2)
    private BigDecimal purity;

    @Column(name = "fine_weight", nullable = false, precision = 12, scale = 3)
    private BigDecimal fineWeight;

    @Column(name = "huid", length = 32)
    private String huid;

    @Column(name = "item_description", length = 255)
    private String itemDescription;

    @Column(name = "remarks", length = 255)
    private String remarks;

    @Column(name = "is_reversal", nullable = false)
    private boolean isReversal = false;

    @Column(name = "reversal_of_voucher", length = 32)
    private String reversalOfVoucher;

    @Column(name = "ai_extracted", nullable = false)
    private boolean aiExtracted = false;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public GoldLedgerEntry() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNumber() { return voucherNumber; }
    public void setVoucherNumber(String voucherNumber) { this.voucherNumber = voucherNumber; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public JobOrder getJobOrder() { return jobOrder; }
    public void setJobOrder(JobOrder jobOrder) { this.jobOrder = jobOrder; }

    public Karigar getKarigar() { return karigar; }
    public void setKarigar(Karigar karigar) { this.karigar = karigar; }

    public BigDecimal getGrossWeight() { return grossWeight; }
    public void setGrossWeight(BigDecimal grossWeight) { this.grossWeight = grossWeight; }

    public BigDecimal getPurity() { return purity; }
    public void setPurity(BigDecimal purity) { this.purity = purity; }

    public BigDecimal getFineWeight() { return fineWeight; }
    public void setFineWeight(BigDecimal fineWeight) { this.fineWeight = fineWeight; }

    public String getHuid() { return huid; }
    public void setHuid(String huid) { this.huid = huid; }

    public String getItemDescription() { return itemDescription; }
    public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public boolean isReversal() { return isReversal; }
    public void setReversal(boolean reversal) { isReversal = reversal; }

    public String getReversalOfVoucher() { return reversalOfVoucher; }
    public void setReversalOfVoucher(String reversalOfVoucher) { this.reversalOfVoucher = reversalOfVoucher; }

    public boolean isAiExtracted() { return aiExtracted; }
    public void setAiExtracted(boolean aiExtracted) { this.aiExtracted = aiExtracted; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
