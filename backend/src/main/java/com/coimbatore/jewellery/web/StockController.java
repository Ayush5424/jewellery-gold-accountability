package com.coimbatore.jewellery.web;

import com.coimbatore.jewellery.service.StockService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')")
    public ResponseEntity<Map<String, Object>> getStockSummary() {
        return ResponseEntity.ok(stockService.getLiveStockSummary());
    }

    @GetMapping("/statement")
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<Map<String, Object>> getDailyStockStatement(@RequestParam(required = false) String date) {
        String effectiveDate = (date != null && !date.isBlank()) ? date : LocalDate.now().toString();
        Map<String, Object> summary = stockService.getDailyStockStatement(effectiveDate);
        summary.put("operatingUnits", List.of(
                Map.of("unit", "Central Workshop (Coimbatore)", "type", "Manufacturing", "activeKarigars", 18),
                Map.of("unit", "RS Puram Showroom", "type", "Retail", "activeKarigars", 5),
                Map.of("unit", "Cross Cut Road Showroom", "type", "Retail", "activeKarigars", 6),
                Map.of("unit", "Gandhipuram Showroom", "type", "Retail", "activeKarigars", 4),
                Map.of("unit", "Town Hall Showroom", "type", "Retail", "activeKarigars", 4),
                Map.of("unit", "Peelamedu Showroom", "type", "Retail", "activeKarigars", 3)
        ));
        return ResponseEntity.ok(summary);
    }

    @GetMapping(value = "/statement/tally-export", produces = MediaType.APPLICATION_XML_VALUE)
    @PreAuthorize("hasAuthority('ROLE_FINANCE_HEAD')")
    public ResponseEntity<String> getTallyXmlExport(@RequestParam(required = false) String date) {
        String effectiveDate = (date != null && !date.isBlank()) ? date : LocalDate.now().toString();
        String tallyXml = stockService.generateTallyXmlExport(effectiveDate);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tally-stock-journal-" + effectiveDate + ".xml\"")
                .body(tallyXml);
    }
}
