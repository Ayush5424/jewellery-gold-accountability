package com.coimbatore.jewellery.data;

import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.UserRole;
import com.coimbatore.jewellery.service.GoldLedgerService;
import com.coimbatore.jewellery.service.JobReconciliationService;
import com.coimbatore.jewellery.service.KarigarWastageService;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryJobOrderRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryKarigarRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class DataInitializerSecurityTest {

    private InMemoryUserRepository userRepo;
    private InMemoryKarigarRepository karigarRepo;
    private InMemoryJobOrderRepository jobRepo;
    private PasswordEncoder passwordEncoder;
    private GoldLedgerService ledgerService;
    private JobReconciliationService reconciliationService;
    private KarigarWastageService wastageService;
    private DataInitializer dataInitializer;

    @BeforeEach
    void setUp() {
        userRepo = new InMemoryUserRepository();
        karigarRepo = new InMemoryKarigarRepository();
        jobRepo = new InMemoryJobOrderRepository();
        passwordEncoder = new BCryptPasswordEncoder();
        ledgerService = Mockito.mock(GoldLedgerService.class);
        reconciliationService = Mockito.mock(JobReconciliationService.class);
        wastageService = Mockito.mock(KarigarWastageService.class);

        dataInitializer = new DataInitializer(
                userRepo,
                karigarRepo,
                jobRepo,
                ledgerService,
                reconciliationService,
                wastageService,
                passwordEncoder
        );
    }

    @Test
    @DisplayName("Idempotence: Existing user password hash is NEVER overwritten on startup")
    void testExistingUserPasswordNeverOverwritten() {
        String existingHash = passwordEncoder.encode("ExistingOriginalPassword@123");
        userRepo.save(new User("finance_head", existingHash, "Saravanan R", UserRole.ROLE_FINANCE_HEAD, null));

        // Attempt running initializer with a new environment password
        dataInitializer.setDemoPasswords("NewDifferentPassword@456", "ClerkPass", "KarigarPass");
        dataInitializer.run();

        User userAfterInit = userRepo.findByUsername("finance_head").orElseThrow();
        assertThat(userAfterInit.getPasswordHash())
                .as("Existing user's BCrypt password hash must remain untouched")
                .isEqualTo(existingHash);
        assertThat(passwordEncoder.matches("ExistingOriginalPassword@123", userAfterInit.getPasswordHash())).isTrue();
        assertThat(passwordEncoder.matches("NewDifferentPassword@456", userAfterInit.getPasswordHash())).isFalse();
    }

    @Test
    @DisplayName("Safety: Missing environment variables do NOT create user with empty or default password")
    void testMissingPasswordDoesNotCreateUser() {
        // Passwords are null / empty
        dataInitializer.setDemoPasswords(null, "", "   ");
        dataInitializer.run();

        assertThat(userRepo.findByUsername("finance_head")).isEmpty();
        assertThat(userRepo.findByUsername("issue_clerk")).isEmpty();
        assertThat(userRepo.findByUsername("murugesan")).isEmpty();
    }

    @Test
    @DisplayName("Security: Newly created users are stored with BCrypt hashes, never plaintext")
    void testNewUserCreatedWithBcryptHash() {
        String rawPass = "SecureInitialPass@2026";
        dataInitializer.setDemoPasswords(rawPass, rawPass, rawPass);
        dataInitializer.run();

        User financeUser = userRepo.findByUsername("finance_head").orElseThrow();
        assertThat(financeUser.getPasswordHash()).startsWith("$2a$").hasSize(60);
        assertThat(financeUser.getPasswordHash()).isNotEqualTo(rawPass);
        assertThat(passwordEncoder.matches(rawPass, financeUser.getPasswordHash())).isTrue();
    }
}
