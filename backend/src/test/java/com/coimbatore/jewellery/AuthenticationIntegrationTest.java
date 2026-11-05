package com.coimbatore.jewellery;

import com.coimbatore.jewellery.common.dto.AppDto;
import com.coimbatore.jewellery.config.JwtService;
import com.coimbatore.jewellery.config.UserDetailsServiceImpl;
import com.coimbatore.jewellery.data.DataInitializer;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryKarigarRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryUserRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryJobOrderRepository;
import com.coimbatore.jewellery.web.AuthController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthenticationIntegrationTest {

    private static final String TEST_FINANCE_PWD = "TestFinancePassword@2026";
    private static final String TEST_CLERK_PWD = "TestClerkPassword@2026";
    private static final String TEST_KARIGAR_PWD = "TestKarigarPassword@2026";

    private InMemoryUserRepository userRepo;
    private InMemoryKarigarRepository karigarRepo;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private UserDetailsServiceImpl userDetailsService;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        userRepo = new InMemoryUserRepository();
        karigarRepo = new InMemoryKarigarRepository();
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService();
        userDetailsService = new UserDetailsServiceImpl(userRepo);

        AuthenticationManager authenticationManager = authentication -> {
            String username = authentication.getName();
            String rawPassword = authentication.getCredentials().toString();
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!passwordEncoder.matches(rawPassword, userDetails.getPassword())) {
                throw new BadCredentialsException("Invalid password");
            }
            return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        };

        authController = new AuthController(authenticationManager, userRepo, jwtService);

        // Seed users with BCrypt-hashed passwords
        Karigar murugesan = karigarRepo.save(new Karigar("KRG-001", "Murugesan S", "+91 98422 10001", "Workshop 1", "murugesan"));
        userRepo.save(new User("finance_head", passwordEncoder.encode(TEST_FINANCE_PWD), "Saravanan R (Finance Head)", UserRole.ROLE_FINANCE_HEAD, null));
        userRepo.save(new User("issue_clerk", passwordEncoder.encode(TEST_CLERK_PWD), "Ramalingam K (Issue Clerk)", UserRole.ROLE_ISSUE_CLERK, null));
        userRepo.save(new User("murugesan", passwordEncoder.encode(TEST_KARIGAR_PWD), "Murugesan S (Master Karigar)", UserRole.ROLE_KARIGAR, murugesan));
    }

    @Test
    @DisplayName("Finance Head successfully logs in and receives valid JWT token")
    void testFinanceHeadLogin() {
        ResponseEntity<AppDto.AuthResponse> response = authController.login(new AppDto.LoginRequest("finance_head", TEST_FINANCE_PWD));
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        AppDto.AuthResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.username()).isEqualTo("finance_head");
        assertThat(body.role()).isEqualTo(UserRole.ROLE_FINANCE_HEAD);
        assertThat(body.token()).isNotBlank();

        String extractedUser = jwtService.extractUsername(body.token());
        assertThat(extractedUser).isEqualTo("finance_head");
    }

    @Test
    @DisplayName("Issue Clerk successfully logs in and receives valid JWT token")
    void testIssueClerkLogin() {
        ResponseEntity<AppDto.AuthResponse> response = authController.login(new AppDto.LoginRequest("issue_clerk", TEST_CLERK_PWD));
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        AppDto.AuthResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.username()).isEqualTo("issue_clerk");
        assertThat(body.role()).isEqualTo(UserRole.ROLE_ISSUE_CLERK);
        assertThat(body.token()).isNotBlank();
    }

    @Test
    @DisplayName("Master Karigar logs in, receives valid JWT token with linked karigarId")
    void testKarigarLogin() {
        ResponseEntity<AppDto.AuthResponse> response = authController.login(new AppDto.LoginRequest("murugesan", TEST_KARIGAR_PWD));
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        AppDto.AuthResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.username()).isEqualTo("murugesan");
        assertThat(body.role()).isEqualTo(UserRole.ROLE_KARIGAR);
        assertThat(body.karigarId()).isNotNull();
        assertThat(body.token()).isNotBlank();
    }

    @Test
    @DisplayName("Passwords are stored as BCrypt hashes with valid salt/prefix, never plaintext")
    void testPasswordsStoredAsBcrypt() {
        User financeUser = userRepo.findByUsername("finance_head").orElseThrow();
        User clerkUser = userRepo.findByUsername("issue_clerk").orElseThrow();
        User karigarUser = userRepo.findByUsername("murugesan").orElseThrow();

        assertThat(financeUser.getPasswordHash()).startsWith("$2a$").hasSize(60);
        assertThat(clerkUser.getPasswordHash()).startsWith("$2a$").hasSize(60);
        assertThat(karigarUser.getPasswordHash()).startsWith("$2a$").hasSize(60);

        assertThat(financeUser.getPasswordHash()).isNotEqualTo(TEST_FINANCE_PWD);
        assertThat(clerkUser.getPasswordHash()).isNotEqualTo(TEST_CLERK_PWD);
        assertThat(karigarUser.getPasswordHash()).isNotEqualTo(TEST_KARIGAR_PWD);
    }

    @Test
    @DisplayName("Login with invalid password throws BadCredentialsException")
    void testInvalidPasswordLogin() {
        assertThatThrownBy(() -> authController.login(new AppDto.LoginRequest("finance_head", "wrongpassword")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid password");
    }

    @Test
    @DisplayName("Login with nonexistent user throws UsernameNotFoundException")
    void testNonexistentUserLogin() {
        assertThatThrownBy(() -> authController.login(new AppDto.LoginRequest("unknown_user", "password123")))
                .isInstanceOf(org.springframework.security.core.userdetails.UsernameNotFoundException.class);
    }

    @Test
    @DisplayName("Root .env file is discovered and loaded into System properties")
    void testDotEnvLoading() {
        JewelleryGoldApplication.loadDotEnv();
        assertThat(System.getProperty("POSTGRES_DB")).isEqualTo("jewellery_gold_db");
    }
}
