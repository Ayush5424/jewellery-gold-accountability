package com.coimbatore.jewellery.repository;

import com.coimbatore.jewellery.domain.entity.LossAlert;
import com.coimbatore.jewellery.domain.enums.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LossAlertRepository extends JpaRepository<LossAlert, Long> {
    List<LossAlert> findByStatusOrderByCreatedAtDesc(AlertStatus status);
    List<LossAlert> findAllByOrderByCreatedAtDesc();
    List<LossAlert> findByKarigarIdOrderByCreatedAtDesc(Long karigarId);
    long countByStatus(AlertStatus status);
}
