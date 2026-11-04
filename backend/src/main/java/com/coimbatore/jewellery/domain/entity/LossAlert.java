package com.coimbatore.jewellery.domain.entity;

import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.domain.enums.AlertType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loss_alert", indexes = {
    @Index(name = "idx_alert_job", columnList = "job_order_id"),
    @Index(name = "idx_alert_karigar", columnList = "karigar_id"),
    @Index(name = "idx_alert_status", columnList = "status")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LossAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_order_id", nullable = false)
    private JobOrder jobOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "karigar_id", nullable = false)
    private Karigar karigar;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 32)
    private AlertType alertType;

    @Column(name = "actual_loss", nullable = false, precision = 12, scale = 3)
    private BigDecimal actualLoss;

    @Column(name = "allowed_loss", nullable = false, precision = 12, scale = 3)
    private BigDecimal allowedLoss;

    @Column(name = "excess_loss", nullable = false, precision = 12, scale = 3)
    private BigDecimal excessLoss;

    @Column(name = "actual_loss_pct", precision = 5, scale = 2)
    private BigDecimal actualLossPct;

    @Column(name = "allowed_loss_pct", precision = 5, scale = 2)
    private BigDecimal allowedLossPct;

    @Column(name = "historical_baseline_pct", precision = 5, scale = 2)
    private BigDecimal historicalBaselinePct;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AlertStatus status = AlertStatus.PENDING_REVIEW;

    @Column(name = "finance_notes", length = 500)
    private String financeNotes;

    @Column(name = "reviewed_by", length = 64)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public LossAlert() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public JobOrder getJobOrder() { return jobOrder; }
    public void setJobOrder(JobOrder jobOrder) { this.jobOrder = jobOrder; }

    public Karigar getKarigar() { return karigar; }
    public void setKarigar(Karigar karigar) { this.karigar = karigar; }

    public AlertType getAlertType() { return alertType; }
    public void setAlertType(AlertType alertType) { this.alertType = alertType; }

    public BigDecimal getActualLoss() { return actualLoss; }
    public void setActualLoss(BigDecimal actualLoss) { this.actualLoss = actualLoss; }

    public BigDecimal getAllowedLoss() { return allowedLoss; }
    public void setAllowedLoss(BigDecimal allowedLoss) { this.allowedLoss = allowedLoss; }

    public BigDecimal getExcessLoss() { return excessLoss; }
    public void setExcessLoss(BigDecimal excessLoss) { this.excessLoss = excessLoss; }

    public BigDecimal getActualLossPct() { return actualLossPct; }
    public void setActualLossPct(BigDecimal actualLossPct) { this.actualLossPct = actualLossPct; }

    public BigDecimal getAllowedLossPct() { return allowedLossPct; }
    public void setAllowedLossPct(BigDecimal allowedLossPct) { this.allowedLossPct = allowedLossPct; }

    public BigDecimal getHistoricalBaselinePct() { return historicalBaselinePct; }
    public void setHistoricalBaselinePct(BigDecimal historicalBaselinePct) { this.historicalBaselinePct = historicalBaselinePct; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public String getFinanceNotes() { return financeNotes; }
    public void setFinanceNotes(String financeNotes) { this.financeNotes = financeNotes; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
