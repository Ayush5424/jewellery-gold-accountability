package com.coimbatore.jewellery.repository;

import com.coimbatore.jewellery.domain.entity.Karigar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KarigarRepository extends JpaRepository<Karigar, Long> {
    Optional<Karigar> findByKarigarCode(String karigarCode);
    Optional<Karigar> findByUsername(String username);
    List<Karigar> findAllByActiveTrueOrderByNameAsc();
}
