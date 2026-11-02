package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.config.JwtService;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<AppDto.AuthResponse> login(@Valid @RequestBody AppDto.LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        User user = userRepository.findByUsername(request.username()).orElseThrow();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("fullName", user.getFullName());
        if (user.getKarigar() != null) {
            claims.put("karigarId", user.getKarigar().getId());
        }

        String token = jwtService.generateToken(userDetails, claims);

        Long karigarId = user.getKarigar() != null ? user.getKarigar().getId() : null;

        return ResponseEntity.ok(new AppDto.AuthResponse(
                token,
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                karigarId
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<AppDto.AuthResponse> getCurrentUser(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        Long karigarId = user.getKarigar() != null ? user.getKarigar().getId() : null;
        return ResponseEntity.ok(new AppDto.AuthResponse(
                null,
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                karigarId
        ));
    }
}
