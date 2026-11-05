package com.coimbatore.jewellery.repository;

import com.coimbatore.jewellery.domain.entity.KarigarWastageAllowance;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KarigarWastageAllowanceRepository extends JpaRepository<KarigarWastageAllowance, Long> {
    List<KarigarWastageAllowance> findByKarigarId(Long karigarId);
    Optional<KarigarWastageAllowance> findByKarigarIdAndItemCategory(Long karigarId, ItemCategory itemCategory);
}
