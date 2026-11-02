package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/karigars")
public class KarigarController {

    private final KarigarRepository karigarRepository;
    private final UserRepository userRepository;

    public KarigarController(KarigarRepository karigarRepository, UserRepository userRepository) {
        this.karigarRepository = karigarRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<List<Karigar>> listActiveKarigars() {
        return ResponseEntity.ok(karigarRepository.findAllByActiveTrueOrderByNameAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Karigar> getKarigarById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !user.getKarigar().getId().equals(id)) {
                throw new AccessDeniedException("Karigars are strictly prohibited from viewing peer accounts.");
            }
        }

        Karigar karigar = karigarRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + id));
        return ResponseEntity.ok(karigar);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<Karigar> createKarigar(@RequestBody Karigar karigar) {
        return ResponseEntity.ok(karigarRepository.save(karigar));
    }
}
