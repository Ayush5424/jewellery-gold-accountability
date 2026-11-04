package com.coimbatore.jewellery;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@SpringBootApplication
public class JewelleryGoldApplication {

    private static final Logger log = LoggerFactory.getLogger(JewelleryGoldApplication.class);

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(JewelleryGoldApplication.class, args);
    }

    /**
     * Automatically discovers and loads key-value pairs from the root .env file into System properties.
     * Searches root directory and parent directory so running directly from IntelliJ IDEA
     * or Maven automatically acquires all configured environment variables.
     * System environment variables set in OS or IDE Run Configuration take priority.
     */
    public static void loadDotEnv() {
        File[] candidatePaths = new File[] {
            new File(".env"),
            new File("../.env"),
            new File(System.getProperty("user.dir"), ".env"),
            new File(System.getProperty("user.dir"), "../.env")
        };

        File envFile = null;
        for (File candidate : candidatePaths) {
            try {
                if (candidate.exists() && candidate.isFile()) {
                    envFile = candidate.getCanonicalFile();
                    break;
                }
            } catch (IOException ignored) {}
        }

        if (envFile == null) {
            log.info("No .env file discovered at candidate locations; proceeding with system environment & defaults.");
            return;
        }

        log.info("Loading environment variables from root .env file: {}", envFile.getAbsolutePath());
        try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    String key = line.substring(0, eqIdx).trim();
                    String value = line.substring(eqIdx + 1).trim();
                    if ((value.startsWith("\"") && value.endsWith("\"")) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    // System.getenv() takes precedence; only set if not present in OS env or System properties
                    if (System.getenv(key) == null && System.getProperty(key) == null) {
                        System.setProperty(key, value);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Failed to read .env file at {}: {}", envFile.getAbsolutePath(), e.getMessage());
        }
    }
}
