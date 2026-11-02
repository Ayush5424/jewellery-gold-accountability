package com.coimbatore.jewellery.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Concurrency-safe voucher number generator.
 * Formats: VCH-YYYYMMDD-XXXXXX
 */
@Service
public class VoucherGeneratorService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
    private final AtomicLong sequence = new AtomicLong(System.currentTimeMillis() % 1000000);

    public synchronized String generateVoucherNumber() {
        String datePart = LocalDate.now().format(DATE_FORMATTER);
        long seq = sequence.incrementAndGet();
        return String.format("VCH-%s-%06d", datePart, seq % 1000000);
    }
}
