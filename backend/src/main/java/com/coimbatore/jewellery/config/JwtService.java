package com.coimbatore.jewellery.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    @Value("${app.jwt.secret:}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpiration = 86400000L;

    public JwtService() {}

    public JwtService(String secretKey, long jwtExpiration) {
        this.secretKey = secretKey;
        this.jwtExpiration = jwtExpiration;
    }

    @PostConstruct
    public void validateConfiguration() {
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalStateException(
                "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. " +
                "Please configure a secure 256-bit secret in your root .env file or system environment."
            );
        }
        byte[] keyBytes = resolveKeyBytes(secretKey.trim());
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET must be at least 256 bits (32 bytes). Current length: " +
                (keyBytes.length * 8) + " bits."
            );
        }
        log.info("JWT service successfully validated with a {}-bit signing key.", keyBytes.length * 8);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private byte[] resolveKeyBytes(String secret) {
        if (secret == null || secret.isEmpty()) {
            throw new IllegalStateException(
                "JWT signing key is not configured. Please define JWT_SECRET in your .env file or environment."
            );
        }
        try {
            byte[] decoded = Decoders.BASE64.decode(secret);
            if (decoded != null && decoded.length >= 32) {
                return decoded;
            }
        } catch (Exception ignored) {
            // Not a valid Base64 string; treat as raw UTF-8 string
        }
        return secret.getBytes(StandardCharsets.UTF_8);
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = resolveKeyBytes(secretKey != null ? secretKey.trim() : "");
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT signing key must be at least 256 bits (32 bytes).");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
