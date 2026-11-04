package com.coimbatore.jewellery.domain.entity;

import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "job_order", indexes = {
    @Index(name = "idx_job_code", columnList = "job_code", unique = true),
    @Index(name = "idx_job_karigar", columnList = "karigar_id"),
    @Index(name = "idx_job_status", columnList = "status")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class JobOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_code", nullable = false, unique = true, length = 32)
    private String jobCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "karigar_id", nullable = false)
    private Karigar karigar;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_category", nullable = false, length = 32)
    private ItemCategory itemCategory;

    @Column(name = "description", length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private JobStatus status = JobStatus.OPEN;

    @Column(name = "allowed_wastage_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal allowedWastagePercent;

    @Column(name = "issued_fine_weight", nullable = false, precision = 12, scale = 3)
    private BigDecimal issuedFineWeight = BigDecimal.ZERO.setScale(3);

    @Column(name = "recovered_fine_weight", nullable = false, precision = 12, scale = 3)
    private BigDecimal recoveredFineWeight = BigDecimal.ZERO.setScale(3);

    @Column(name = "outstanding_fine_weight", nullable = false, precision = 12, scale = 3)
    private BigDecimal outstandingFineWeight = BigDecimal.ZERO.setScale(3);

    @Column(name = "actual_loss", precision = 12, scale = 3)
    private BigDecimal actualLoss;

    @Column(name = "excess_loss", precision = 12, scale = 3)
    private BigDecimal excessLoss;

    @Column(name = "actual_loss_pct", precision = 5, scale = 2)
    private BigDecimal actualLossPct;

    @Column(name = "reconciled_at")
    private Instant reconciledAt;

    @Column(name = "reconciled_by", length = 64)
    private String reconciledBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public JobOrder() {}

    public JobOrder(String jobCode, Karigar karigar, ItemCategory itemCategory, String description, BigDecimal allowedWastagePercent) {
        this.jobCode = jobCode;
        this.karigar = karigar;
        this.itemCategory = itemCategory;
        this.description = description;
        this.allowedWastagePercent = allowedWastagePercent;
        this.status = JobStatus.OPEN;
        this.issuedFineWeight = BigDecimal.ZERO.setScale(3);
        this.recoveredFineWeight = BigDecimal.ZERO.setScale(3);
        this.outstandingFineWeight = BigDecimal.ZERO.setScale(3);
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getJobCode() { return jobCode; }
    public void setJobCode(String jobCode) { this.jobCode = jobCode; }

    public Karigar getKarigar() { return karigar; }
    public void setKarigar(Karigar karigar) { this.karigar = karigar; }

    public ItemCategory getItemCategory() { return itemCategory; }
    public void setItemCategory(ItemCategory itemCategory) { this.itemCategory = itemCategory; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public JobStatus getStatus() { return status; }
    public void setStatus(JobStatus status) { this.status = status; }

    public BigDecimal getAllowedWastagePercent() { return allowedWastagePercent; }
    public void setAllowedWastagePercent(BigDecimal allowedWastagePercent) { this.allowedWastagePercent = allowedWastagePercent; }

    public BigDecimal getIssuedFineWeight() { return issuedFineWeight; }
    public void setIssuedFineWeight(BigDecimal issuedFineWeight) { this.issuedFineWeight = issuedFineWeight; }

    public BigDecimal getRecoveredFineWeight() { return recoveredFineWeight; }
    public void setRecoveredFineWeight(BigDecimal recoveredFineWeight) { this.recoveredFineWeight = recoveredFineWeight; }

    public BigDecimal getOutstandingFineWeight() { return outstandingFineWeight; }
    public void setOutstandingFineWeight(BigDecimal outstandingFineWeight) { this.outstandingFineWeight = outstandingFineWeight; }

    public BigDecimal getActualLoss() { return actualLoss; }
    public void setActualLoss(BigDecimal actualLoss) { this.actualLoss = actualLoss; }

    public BigDecimal getExcessLoss() { return excessLoss; }
    public void setExcessLoss(BigDecimal excessLoss) { this.excessLoss = excessLoss; }

    public BigDecimal getActualLossPct() { return actualLossPct; }
    public void setActualLossPct(BigDecimal actualLossPct) { this.actualLossPct = actualLossPct; }

    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }

    public String getReconciledBy() { return reconciledBy; }
    public void setReconciledBy(String reconciledBy) { this.reconciledBy = reconciledBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
