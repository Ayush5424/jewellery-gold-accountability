package com.coimbatore.jewellery.repository;

import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobOrderRepository extends JpaRepository<JobOrder, Long> {
    Optional<JobOrder> findByJobCode(String jobCode);
    List<JobOrder> findByKarigarIdOrderByCreatedAtDesc(Long karigarId);
    List<JobOrder> findByStatusOrderByCreatedAtDesc(JobStatus status);

    @Query("SELECT j FROM JobOrder j WHERE j.karigar.id = :karigarId AND j.status = 'RECONCILED' ORDER BY j.reconciledAt DESC")
    List<JobOrder> findReconciledJobsByKarigar(@Param("karigarId") Long karigarId);
}
