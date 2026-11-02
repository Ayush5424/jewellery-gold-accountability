package com.coimbatore.jewellery.domain.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "karigar", indexes = {
    @Index(name = "idx_karigar_code", columnList = "karigar_code", unique = true),
    @Index(name = "idx_karigar_username", columnList = "username")
})
public class Karigar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "karigar_code", nullable = false, unique = true, length = 32)
    private String karigarCode;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "phone", length = 32)
    private String phone;

    @Column(name = "workshop_location", length = 128)
    private String workshopLocation;

    @Column(name = "historical_loss_avg_pct", precision = 5, scale = 2)
    private BigDecimal historicalLossAvgPct = BigDecimal.ZERO;

    @Column(name = "completed_jobs_count", nullable = false)
    private int completedJobsCount = 0;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "username", length = 64)
    private String username;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Karigar() {}

    public Karigar(String karigarCode, String name, String phone, String workshopLocation, String username) {
        this.karigarCode = karigarCode;
        this.name = name;
        this.phone = phone;
        this.workshopLocation = workshopLocation;
        this.username = username;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getKarigarCode() { return karigarCode; }
    public void setKarigarCode(String karigarCode) { this.karigarCode = karigarCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getWorkshopLocation() { return workshopLocation; }
    public void setWorkshopLocation(String workshopLocation) { this.workshopLocation = workshopLocation; }

    public BigDecimal getHistoricalLossAvgPct() { return historicalLossAvgPct; }
    public void setHistoricalLossAvgPct(BigDecimal historicalLossAvgPct) { this.historicalLossAvgPct = historicalLossAvgPct; }

    public int getCompletedJobsCount() { return completedJobsCount; }
    public void setCompletedJobsCount(int completedJobsCount) { this.completedJobsCount = completedJobsCount; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
