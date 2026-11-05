package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.KarigarWastageAllowance;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.UserRepository;
import com.coimbatore.jewellery.service.KarigarWastageService;
import jakarta.validation.Valid;
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
    private final KarigarWastageService karigarWastageService;

    public KarigarController(KarigarRepository karigarRepository,
                             UserRepository userRepository,
                             KarigarWastageService karigarWastageService) {
        this.karigarRepository = karigarRepository;
        this.userRepository = userRepository;
        this.karigarWastageService = karigarWastageService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<List<AppDto.KarigarResponse>> listActiveKarigars() {
        return ResponseEntity.ok(karigarRepository.findAllByActiveTrueOrderByNameAsc()
                .stream()
                .map(AppDto.KarigarResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppDto.KarigarResponse> getKarigarById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !user.getKarigar().getId().equals(id)) {
                throw new AccessDeniedException("Karigars are strictly prohibited from viewing peer accounts.");
            }
        }

        Karigar karigar = karigarRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Karigar not found: " + id));
        return ResponseEntity.ok(AppDto.KarigarResponse.from(karigar));
    }

    @GetMapping("/{id}/wastage-allowances")
    public ResponseEntity<List<AppDto.KarigarWastageAllowanceResponse>> getWastageAllowances(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() == UserRole.ROLE_KARIGAR) {
            if (user.getKarigar() == null || !user.getKarigar().getId().equals(id)) {
                throw new AccessDeniedException("Karigars are strictly prohibited from viewing peer allowances.");
            }
        }
        return ResponseEntity.ok(karigarWastageService.getAllowancesForKarigar(id).stream()
                .map(AppDto.KarigarWastageAllowanceResponse::from)
                .toList());
    }

    @PutMapping("/{id}/wastage-allowances")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.KarigarWastageAllowanceResponse> updateWastageAllowance(
            @PathVariable Long id,
            @Valid @RequestBody AppDto.UpdateWastageAllowanceRequest request,
            Authentication auth) {
        KarigarWastageAllowance allowance = karigarWastageService.updateAllowance(
                id, request.itemCategory(), request.allowedWastagePercent(), auth != null ? auth.getName() : "FINANCE_HEAD");
        return ResponseEntity.ok(AppDto.KarigarWastageAllowanceResponse.from(allowance));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<AppDto.KarigarResponse> createKarigar(@RequestBody Karigar karigar, Authentication auth) {
        if (karigar.getKarigarCode() == null || karigar.getKarigarCode().isBlank()) {
            karigar.setKarigarCode(String.format("KRG-%03d", karigarRepository.count() + 1));
        }
        if (karigar.getUsername() == null || karigar.getUsername().isBlank()) {
            karigar.setUsername(karigar.getName().toLowerCase().replaceAll("[^a-z0-9]", ""));
        }
        karigar.setActive(true);
        Karigar saved = karigarRepository.save(karigar);
        karigarWastageService.seedDefaultsForKarigar(saved, auth != null ? auth.getName() : "ADMIN");
        return ResponseEntity.ok(AppDto.KarigarResponse.from(saved));
    }
}
