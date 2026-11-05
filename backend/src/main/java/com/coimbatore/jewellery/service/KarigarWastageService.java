package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.common.exception.BusinessValidationException;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.KarigarWastageAllowance;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.KarigarWastageAllowanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class KarigarWastageService {

    public static final Map<ItemCategory, BigDecimal> WORKSHOP_DEFAULT_ALLOWANCES = Map.of(
            ItemCategory.CHAIN, new BigDecimal("1.20"),
            ItemCategory.BANGLES, new BigDecimal("1.50"),
            ItemCategory.RING, new BigDecimal("1.00"),
            ItemCategory.NECKLACE, new BigDecimal("1.80"),
            ItemCategory.EARRINGS, new BigDecimal("1.40"),
            ItemCategory.TEMPLE_JEWELLERY, new BigDecimal("2.50"),
            ItemCategory.COIN_BAR, new BigDecimal("0.20")
    );

    private final KarigarWastageAllowanceRepository allowanceRepository;
    private final KarigarRepository karigarRepository;

    public KarigarWastageService(KarigarWastageAllowanceRepository allowanceRepository,
                                 KarigarRepository karigarRepository) {
        this.allowanceRepository = allowanceRepository;
        this.karigarRepository = karigarRepository;
    }

    /**
     * Retrieves all wastage allowances for a Karigar across all item categories.
     * If an allowance is not yet explicitly customized for a category, returns the workshop standard baseline.
     */
    @Transactional(readOnly = true)
    public List<KarigarWastageAllowance> getAllowancesForKarigar(Long karigarId) {
        Karigar karigar = karigarRepository.findById(karigarId)
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + karigarId));

        List<KarigarWastageAllowance> existing = allowanceRepository.findByKarigarId(karigarId);
        Map<ItemCategory, KarigarWastageAllowance> map = new EnumMap<>(ItemCategory.class);
        for (KarigarWastageAllowance a : existing) {
            map.put(a.getItemCategory(), a);
        }

        List<KarigarWastageAllowance> result = new ArrayList<>();
        for (ItemCategory cat : ItemCategory.values()) {
            if (map.containsKey(cat)) {
                result.add(map.get(cat));
            } else {
                BigDecimal defaultRate = WORKSHOP_DEFAULT_ALLOWANCES.getOrDefault(cat, new BigDecimal("1.50"));
                KarigarWastageAllowance virtual = new KarigarWastageAllowance(karigar, cat, defaultRate, "SYSTEM_DEFAULT");
                result.add(virtual);
            }
        }
        return result;
    }

    /**
     * Resolves the authoritative agreed wastage percentage for a specific Karigar and Item Category.
     */
    @Transactional(readOnly = true)
    public BigDecimal resolveWastagePercent(Long karigarId, ItemCategory category) {
        return allowanceRepository.findByKarigarIdAndItemCategory(karigarId, category)
                .map(KarigarWastageAllowance::getAllowedWastagePercent)
                .orElseGet(() -> WORKSHOP_DEFAULT_ALLOWANCES.getOrDefault(category, new BigDecimal("1.50")));
    }

    /**
     * Updates or creates a category wastage allowance for a Karigar.
     * Enforces strict business validation: percentage must be between 0.01% and 20.00%.
     * Captures updatedBy for compliance auditing.
     */
    public KarigarWastageAllowance updateAllowance(Long karigarId, ItemCategory category, BigDecimal percentage, String updatedBy) {
        if (percentage == null) {
            throw new BusinessValidationException("Wastage percentage cannot be null");
        }
        if (percentage.compareTo(new BigDecimal("0.01")) < 0 || percentage.compareTo(new BigDecimal("20.00")) > 0) {
            throw new BusinessValidationException("Wastage percentage must be between 0.01% and 20.00%: " + percentage);
        }

        Karigar karigar = karigarRepository.findById(karigarId)
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + karigarId));

        BigDecimal scaled = percentage.setScale(2, RoundingMode.HALF_UP);

        KarigarWastageAllowance allowance = allowanceRepository.findByKarigarIdAndItemCategory(karigarId, category)
                .orElseGet(() -> new KarigarWastageAllowance(karigar, category, scaled, updatedBy));

        allowance.setAllowedWastagePercent(scaled);
        allowance.setUpdatedBy(updatedBy != null ? updatedBy : "FINANCE_HEAD");
        allowance.setUpdatedAt(Instant.now());

        return allowanceRepository.save(allowance);
    }

    /**
     * Initializes default matrix records for newly created Karigars.
     */
    public void seedDefaultsForKarigar(Karigar karigar, String createdBy) {
        for (Map.Entry<ItemCategory, BigDecimal> entry : WORKSHOP_DEFAULT_ALLOWANCES.entrySet()) {
            if (allowanceRepository.findByKarigarIdAndItemCategory(karigar.getId(), entry.getKey()).isEmpty()) {
                allowanceRepository.save(new KarigarWastageAllowance(
                        karigar,
                        entry.getKey(),
                        entry.getValue(),
                        createdBy != null ? createdBy : "SYSTEM"
                ));
            }
        }
    }
}
