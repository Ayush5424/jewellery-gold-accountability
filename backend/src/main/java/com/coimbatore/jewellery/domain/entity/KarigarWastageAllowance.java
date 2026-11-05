package com.coimbatore.jewellery.domain.entity;

import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "karigar_wastage_allowance", uniqueConstraints = {
    @UniqueConstraint(name = "uk_karigar_category", columnNames = {"karigar_id", "item_category"})
}, indexes = {
    @Index(name = "idx_allowance_karigar", columnList = "karigar_id"),
    @Index(name = "idx_allowance_category", columnList = "item_category")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KarigarWastageAllowance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "karigar_id", nullable = false)
    private Karigar karigar;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_category", nullable = false, length = 32)
    private ItemCategory itemCategory;

    @Column(name = "allowed_wastage_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal allowedWastagePercent;

    @Column(name = "updated_by", length = 64)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public KarigarWastageAllowance() {}

    public KarigarWastageAllowance(Karigar karigar, ItemCategory itemCategory, BigDecimal allowedWastagePercent, String updatedBy) {
        this.karigar = karigar;
        this.itemCategory = itemCategory;
        this.allowedWastagePercent = allowedWastagePercent;
        this.updatedBy = updatedBy;
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Karigar getKarigar() { return karigar; }
    public void setKarigar(Karigar karigar) { this.karigar = karigar; }

    public ItemCategory getItemCategory() { return itemCategory; }
    public void setItemCategory(ItemCategory itemCategory) { this.itemCategory = itemCategory; }

    public BigDecimal getAllowedWastagePercent() { return allowedWastagePercent; }
    public void setAllowedWastagePercent(BigDecimal allowedWastagePercent) { this.allowedWastagePercent = allowedWastagePercent; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
