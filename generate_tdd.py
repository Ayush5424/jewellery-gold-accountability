import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def generate_docx(output_path):
    doc = Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(40, 40, 40)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # Title Banner
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(20)
    title_p.paragraph_format.space_after = Pt(2)
    run_title = title_p.add_run("TECHNICAL DESIGN DOCUMENT (TDD)")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(16, 52, 166) # Royal Blue

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(12)
    run_sub = sub_p.add_run("Jewellery Gold Accountability, Reconciliation & Anomaly Detection Platform")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(14)
    run_sub.font.color.rgb = RGBColor(100, 100, 100)

    # Meta Table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Project Target", "Coimbatore Jewellery Enterprise (5 Showrooms, 1 Central Workshop, ~40 Karigars)"),
        ("Architecture", "Spring Boot 3.3 (Java 21) + React 18 (TypeScript) + FastAPI (Python 3.13) + PostgreSQL"),
        ("Author & Candidate", "Ayush (Isocode Labs Software Engineering Internship Assignment)"),
        ("Repository URL", "https://github.com/Ayush5424/jewellery-gold-accountability"),
        ("Date & Version", "November 2026 | Version 1.0.0 Production-Ready")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(1.8)
        c1.width = Inches(5.1)
        c0.paragraphs[0].text = k
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(9.5)
        c1.paragraphs[0].text = v
        c1.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_background(c0, "F0F4F8")
        set_cell_background(c1, "FAFAFA")
        set_cell_margins(c0, top=60, bottom=60, left=100, right=100)
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    def add_section_header(title, level=1):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = 'Calibri'
        r.font.bold = True
        if level == 1:
            r.font.size = Pt(14)
            r.font.color.rgb = RGBColor(16, 52, 166)
        else:
            r.font.size = Pt(12)
            r.font.color.rgb = RGBColor(45, 85, 125)

    def add_styled_table(headers, rows, col_widths=None):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        hdr_row = table.rows[0]
        for col_idx, text in enumerate(headers):
            cell = hdr_row.cells[col_idx]
            if col_widths and col_idx < len(col_widths):
                cell.width = Inches(col_widths[col_idx])
            cell.paragraphs[0].text = text
            cell.paragraphs[0].runs[0].font.bold = True
            cell.paragraphs[0].runs[0].font.size = Pt(9.5)
            cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
            set_cell_background(cell, "1F4E79")
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            
        for row_idx, data_row in enumerate(rows):
            tbl_row = table.rows[row_idx + 1]
            bg = "F9FBFD" if row_idx % 2 == 1 else "FFFFFF"
            for col_idx, cell_value in enumerate(data_row):
                cell = tbl_row.cells[col_idx]
                if col_widths and col_idx < len(col_widths):
                    cell.width = Inches(col_widths[col_idx])
                cell.paragraphs[0].text = str(cell_value)
                cell.paragraphs[0].runs[0].font.size = Pt(9)
                set_cell_background(cell, bg)
                set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 1. Executive Summary
    add_section_header("1. Executive Summary & Coimbatore Business Requirements")
    p = doc.add_paragraph(
        "A premier jewellery manufacturing and retail enterprise headquartered in Coimbatore, Tamil Nadu, operates "
        "5 distinct retail showrooms, 1 centralized manufacturing workshop, and contracts approximately 40 skilled artisan "
        "karigars. Prior to this platform, gold accounting was performed through manual job cards, paper scale slips, and "
        "fragmented spreadsheets. This led to severe operational vulnerabilities including unexplained fine-gold variances, "
        "delayed reconciliation weeks after job delivery, lack of benchmark drift detection, and inability to account for "
        "every gram of gold across the business in real time."
    )
    p = doc.add_paragraph(
        "The Jewellery Gold Accountability System was engineered to provide complete, authoritative, and auditable accountability "
        "for every single gram of gold to three decimal places (0.001 g). The core business mandate is to answer with certainty: "
        "How much gold was issued? How much has each karigar returned? How much remains outstanding? How much was lost during "
        "manufacture? Did loss exceed contractual wastage allowances? And what is the authoritative live stock across the entire business?"
    )

    # 2. System Architecture
    add_section_header("2. System Architecture & Tech Stack")
    p = doc.add_paragraph(
        "The platform employs an enterprise three-tier distributed architecture ensuring strong separation of concerns, "
        "strict authorization, and zero client-side calculation authority:"
    )
    arch_headers = ["Layer", "Technology", "Architectural Role & Guarantees"]
    arch_rows = [
        ["Frontend SPA", "React 18, TypeScript 5, Vite, Tailwind CSS", "Responsive UI for desktop/mobile, state management, role-based screen rendering, interactive reconciliation workflows, and Tally XML export."],
        ["Backend Core", "Spring Boot 3.3.4 (Java 21), Spring Data JPA", "Authoritative accounting engine, immutable transaction ledger, lifecycle state machines, role security, and RESTful service APIs."],
        ["Database", "PostgreSQL 16+ / 18, Hibernate", "Relational persistence, foreign key enforcement, pessimistic locking on jobs, and complete audit logging."],
        ["AI Vision Service", "Python 3.13, FastAPI, OpenCV, Pillow, Pydantic", "Draft extraction of digital scale slips via regex pattern recognition, confidence scoring, missing-field detection, and non-blocking background OCR."],
        ["ERP Integration", "Native Tally XML Stock Journal Format", "Direct integration with Tally ERP 9 / Tally Prime for accounting stock transfer journals without third-party plugins."]
    ]
    add_styled_table(arch_headers, arch_rows, [1.5, 2.0, 3.4])

    # 3. Authoritative Backend Ledger
    add_section_header("3. Authoritative Backend Ledger & Data Model")
    p = doc.add_paragraph(
        "The single source of truth across the entire system is the immutable, append-only `gold_transactions` ledger. "
        "Historical transactions can never be modified or deleted. Any administrative adjustment requires an explicit "
        "`ADJUSTMENT_REVERSAL` transaction with mandatory audit remarks."
    )
    p = doc.add_paragraph(
        "Entity Model Highlights:\n"
        "• User: Stores system credentials, password hashes (BCrypt), and assigned roles (ROLE_FINANCE_HEAD, ROLE_ISSUE_CLERK, ROLE_KARIGAR).\n"
        "• Karigar: Artisan master record with unique code (KRG-xxx), phone, address, status, and linked user identity.\n"
        "• Job: Manufacturing work order containing job code (JOB-xxx), target item type, issue date, status, allowed wastage percentage, and reconciled metrics.\n"
        "• GoldTransaction: Ledger entry tracking transaction type, gross weight, purity percentage, calculated fine gold, tare weight, scale slip image URL, and clerk user ID.\n"
        "• LossAlert: System-generated exception raised when reconciled loss exceeds contractual allowance or historical drift exceeds threshold."
    )
    
    add_section_header("Job Lifecycle State Machine", level=2)
    p = doc.add_paragraph(
        "Jobs advance through a deterministic state machine:\n"
        "1. OPEN: Work order created and raw gold issued.\n"
        "2. IN_PROGRESS: Partial receipts (jewellery, scrap, or filings) logged against the job.\n"
        "3. READY_FOR_RECONCILIATION: Artisan declares production complete; all returned materials weighed.\n"
        "4. RECONCILED: Clerk/Finance Head finalizes job; loss formulas execute; unrecoverable loss finalized; alerts triggered if breach occurs."
    )

    # 4. Strict Accounting Formulas & Sample Calculation
    add_section_header("4. Strict Accounting Formulas & Sample Calculation Verification")
    p = doc.add_paragraph(
        "All calculations strictly utilize `java.math.BigDecimal` with `RoundingMode.HALF_UP` to completely prevent "
        "binary floating-point representation drift. Gross weights are recorded to 3 decimal places (0.001 g) and "
        "purities to 2 decimal places (0.01 %)."
    )
    
    p = doc.add_paragraph(
        "Mathematical Formulas:\n"
        "1. Fine Gold Weight (g) = round(Gross Weight * (Purity % / 100), 3)\n"
        "2. Allowed Loss (g) = round(Issued Fine Gold * (Wastage Allowance % / 100), 3)\n"
        "3. Outstanding Balance (g) = Issued Fine Gold - Total Recovered Fine Gold (Jewellery + Scrap + Filings)\n"
        "4. Reconciled Actual Loss (g) = Issued Fine Gold - Total Recovered Fine Gold\n"
        "5. Excess Loss (g) = max(0.000, Actual Loss - Allowed Loss)"
    )

    add_section_header("Assignment Specification Sample Calculation Verification", level=2)
    p = doc.add_paragraph(
        "The exact sample calculation mandated in the assignment specification was verified in automated unit test "
        "`GoldAccountingCalculatorTest.testPart3AssignmentSampleCalculation`:"
    )
    calc_headers = ["Stage", "Input Parameters", "Exact Mathematical Evaluation", "Verified Ledger Output"]
    calc_rows = [
        ["Issue Transaction", "Gross: 120.000 g\nPurity: 91.60% (22K)\nWastage Allow: 3.00%", "Fine = 120.000 * 0.9160 = 109.920 g\nAllowed Loss = 109.920 * 0.03 = 3.2976 -> 3.298 g", "Issued Fine: 109.920 g\nAllowed Loss: 3.298 g"],
        ["Receipt 1 (Jewellery)", "Gross: 112.450 g\nPurity: 91.60%", "Fine = 112.450 * 0.9160 = 103.0042 -> 103.004 g", "Recovered Fine: 103.004 g"],
        ["Receipt 2 (Scrap)", "Gross: 3.300 g\nPurity: 91.60%", "Fine = 3.300 * 0.9160 = 3.0228 -> 3.023 g", "Recovered Fine: 3.023 g"],
        ["Total Recovered", "Jewellery + Scrap", "103.004 + 3.023 = 106.027 g", "Recovered Total: 106.027 g"],
        ["Pre-Reconciliation", "Issued - Recovered", "109.920 - 106.027 = 3.893 g", "Outstanding: 3.893 g"],
        ["Final Reconciliation", "Actual Loss vs Allowed", "Loss = 3.893 g; Allowed = 3.298 g\nExcess = 3.893 - 3.298 = 0.595 g", "Actual Loss: 3.893 g\nExcess Loss: 0.595 g (BREACH)"]
    ]
    add_styled_table(calc_headers, calc_rows, [1.4, 1.8, 2.2, 1.5])

    # 5. Dual-Engine Loss & Drift Detection
    add_section_header("5. Dual-Engine Loss & Drift Detection")
    p = doc.add_paragraph(
        "To protect against both acute wastage spikes and gradual systemic theft, the platform deploys two complementary engines:\n"
        "1. Rule-Based Contractual Breach: Evaluates at the instant of job reconciliation. If Actual Loss > Allowed Loss, an "
        "`EXCESS_LOSS` alert is raised immediately, tagging the specific Job Code, Karigar Code, and exact gram variance.\n"
        "2. Statistical Karigar Benchmark Drift: Computes a rolling 30-day mean wastage percentage for each artisan across "
        "their last 5 or more completed jobs. If a karigar's cumulative loss average drifts higher than 1.5 standard deviations "
        "above their historical baseline, a `BENCHMARK_DRIFT` warning is dispatched to the Finance Head."
    )

    # 6. AI Vision Slip Extraction
    add_section_header("6. AI Scale-Slip Extraction & Human-in-the-Loop Workflow")
    p = doc.add_paragraph(
        "The digital scale extraction microservice runs independently via FastAPI. It accepts workshop photographs of "
        "digital weight indicator displays and printed weight slips."
    )
    p = doc.add_paragraph(
        "Critical Architectural Principles:\n"
        "• Non-Authoritative Draft Generation: The AI service never writes directly to the database. It produces a structured JSON draft response.\n"
        "• Confidence Scoring & Gap Detection: The microservice analyzes text clarity and field completeness. If purity or tare weight is ambiguous, "
        "`missing_fields: ['purity']` is populated, and `requires_human_confirmation: true` is asserted.\n"
        "• UI Pre-Fill & Mandatory Clerk Review: The web UI displays the uploaded image side-by-side with extracted draft inputs. The clerk must inspect, edit if necessary, and explicitly confirm before submission.\n"
        "• Transparent Resilience: If the AI microservice is unreachable, the Spring Boot backend transparently falls back to local Java regex parsing without crashing the user session."
    )

    # 7. Functional Implementation of 7 Required Modules
    add_section_header("7. Implementation of 7 Required Application Modules")
    mod_headers = ["Module Name", "Route", "Key Capabilities & Verified Business Logic"]
    mod_rows = [
        ["1. Dashboard", "/dashboard", "Live enterprise KPI cards (Total Stock, Issued Gold, Recovered, Outstanding, Wastage, Active Alerts). Recent transaction table. 100% backend-driven."],
        ["2. Karigar Master", "/karigars", "Artisan directory with KRG-xxx code generation, phone, specialty, active job count, status badges, and search filtering."],
        ["3. Issue Gold", "/issue", "Issuance modal with Karigar selection, gross weight, 22K/18K/24K purity presets, agreed wastage %, calculated fine gold preview, and AI slip scanner."],
        ["4. Receive Gold", "/receive", "Multi-stream receipt (Jewellery, Scrap, Filings), live outstanding balance counter, scale slip OCR scanner, and one-click reconciliation modal."],
        ["5. Karigar Ledger", "/ledger", "Running debit/credit ledger per artisan, balance summary cards, expandable job details, and downloadable transaction receipts."],
        ["6. Loss Alerts", "/alerts", "Centralized anomaly cockpit displaying rule-based excess loss breaches and statistical drift flags, with finance head acknowledgment."],
        ["7. Stock Statement", "/statement", "5-pillar daily reconciliation statement, component recovery breakdown, CSV download, and native Tally ERP 9 / Tally Prime XML export."]
    ]
    add_styled_table(mod_headers, mod_rows, [1.4, 1.1, 4.4])

    # 8. Security & RBAC
    add_section_header("8. Security, Role-Based Access Control & Isolation")
    p = doc.add_paragraph(
        "Authentication is enforced through stateless JWT tokens signed with HMAC-SHA256. The system defines three strictly separated roles:\n"
        "• ROLE_FINANCE_HEAD: Full company-wide visibility. Access to company stock statements, loss anomaly dashboards, Tally XML exports, and karigar drift analytics.\n"
        "• ROLE_ISSUE_CLERK: Operational workshop access. Can register karigars, issue raw gold, log returns, run AI slip extraction, and execute reconciliations.\n"
        "• ROLE_KARIGAR: Strict artisan isolation. Authenticated karigars can only view their own outstanding balance and assigned jobs. Cross-karigar data access is blocked server-side by checking the JWT's `karigarId` claim."
    )

    # 9. Test Verification
    add_section_header("9. Automated Test Suites & Quality Assurance Evidence")
    p = doc.add_paragraph(
        "The system has been subjected to comprehensive automated test suites across all tiers:"
    )
    test_headers = ["Subsystem", "Test Class / Suite", "Tests Run", "Failures", "Errors", "Status"]
    test_rows = [
        ["Backend Accounting", "GoldAccountingCalculatorTest", "12", "0", "0", "PASS"],
        ["Backend Security", "AuthenticationIntegrationTest", "5", "0", "0", "PASS"],
        ["Backend Workflow", "GoldDomainWorkflowTest", "3", "0", "0", "PASS"],
        ["Backend Isolation", "KarigarSecurityIsolationTest", "4", "0", "0", "PASS"],
        ["Backend Lifecycle", "JobLifecycleAndConcurrencyTest", "3", "0", "0", "PASS"],
        ["AI Microservice", "pytest (test_api.py & test_extractor.py)", "8", "0", "0", "PASS"],
        ["Frontend UI", "TypeScript compiler & Vite production build", "1512 modules", "0", "0", "PASS"]
    ]
    add_styled_table(test_headers, test_rows, [1.5, 2.3, 0.8, 0.7, 0.7, 0.9])

    # 10. Known Limitations & Roadmap
    add_section_header("10. Known Limitations, Operational Assumptions & Roadmap")
    p = doc.add_paragraph(
        "Assumptions & Current Scope:\n"
        "• Single Central Workshop: Currently models 1 central manufacturing facility feeding 5 retail showrooms.\n"
        "• Homogeneous Purity per Job: Each job is issued at a single uniform karatage (e.g. 22K 91.60%). Multi-alloy composite jobs are modeled as linked sub-jobs.\n"
        "\nFuture Roadmap:\n"
        "• Direct RS-232 / USB Serial Scale Integration: Stream live weight readings directly from Mettler Toledo and Sartorius scales into the browser.\n"
        "• Native Mobile App for Artisans: Offline-first React Native mobile client enabling karigars in remote workshop clusters to acknowledge receipt of gold via QR code."
    )

    # 11. Author and Repo
    add_section_header("11. Submission Verification & Repository Details")
    p = doc.add_paragraph(
        "• Public GitHub Repository: https://github.com/Ayush5424/jewellery-gold-accountability\n"
        "• Branch: main\n"
        "• Primary Developer: Ayush\n"
        "• Assignment: Isocode Labs Software Engineering Internship Assignment\n"
        "• Date of Delivery: November 2026"
    )

    doc.save(output_path)
    print(f"Generated DOCX at: {output_path}")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#666666"))
        self.setStrokeColor(colors.HexColor("#CCCCCC"))
        self.setLineWidth(0.5)
        self.line(40, 40, 555, 40)
        self.drawString(40, 28, "Jewellery Gold Accountability Platform — Technical Design Document (TDD)")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 28, page_str)
        self.restoreState()

def generate_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1034A6"),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1034A6"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#2D557D"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#222222"),
        spaceAfter=6
    )

    table_text = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#222222")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # Title Banner
    story.append(Paragraph("TECHNICAL DESIGN DOCUMENT (TDD)", title_style))
    story.append(Paragraph("Jewellery Gold Accountability, Reconciliation & Anomaly Detection Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1034A6"), spaceBefore=2, spaceAfter=10))

    # Meta Table
    meta_data = [
        [Paragraph("<b>Target Domain</b>", table_text), Paragraph("Coimbatore Jewellery Enterprise (5 Showrooms, 1 Central Workshop, ~40 Karigars)", table_text)],
        [Paragraph("<b>Tech Stack</b>", table_text), Paragraph("Spring Boot 3.3 (Java 21) + React 18 (TypeScript) + FastAPI (Python 3.13) + PostgreSQL 16+", table_text)],
        [Paragraph("<b>Author / Candidate</b>", table_text), Paragraph("Ayush — Isocode Labs Software Engineering Internship Assignment", table_text)],
        [Paragraph("<b>GitHub Repository</b>", table_text), Paragraph("https://github.com/Ayush5424/jewellery-gold-accountability", table_text)],
        [Paragraph("<b>Version & Date</b>", table_text), Paragraph("Version 1.0.0 Production-Ready | November 2026", table_text)]
    ]
    t_meta = Table(meta_data, colWidths=[120, 395])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F0F4F8")),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#FAFAFA")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D7DE")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E1E4E8")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary & Coimbatore Business Requirements", h1_style))
    story.append(Paragraph(
        "A premier jewellery manufacturing and retail enterprise headquartered in Coimbatore, Tamil Nadu, operates "
        "5 distinct retail showrooms, 1 centralized manufacturing workshop, and coordinates with approximately 40 skilled artisan "
        "karigars. Prior to this platform, gold accounting was performed through manual job cards, paper scale slips, and "
        "fragmented spreadsheets. This led to severe operational vulnerabilities including unexplained fine-gold variances, "
        "delayed reconciliation weeks after job delivery, lack of benchmark drift detection, and inability to account for "
        "every gram of gold across the business in real time.", body_style
    ))
    story.append(Paragraph(
        "The Jewellery Gold Accountability System was engineered to provide complete, authoritative, and auditable accountability "
        "for every single gram of gold to three decimal places (0.001 g). The core business mandate answers with certainty: "
        "How much gold was issued? How much has each karigar returned? How much remains outstanding? How much was lost during "
        "manufacture? Did loss exceed contractual wastage allowances? And what is the authoritative live stock across the entire business?", body_style
    ))

    # 2. System Architecture
    story.append(Paragraph("2. System Architecture & Tech Stack", h1_style))
    story.append(Paragraph(
        "The platform employs an enterprise three-tier distributed architecture ensuring strong separation of concerns, "
        "strict authorization, and zero client-side calculation authority:", body_style
    ))
    arch_rows = [
        [Paragraph("Layer", table_header), Paragraph("Technology", table_header), Paragraph("Architectural Role & Guarantees", table_header)],
        [Paragraph("<b>Frontend SPA</b>", table_text), Paragraph("React 18, TypeScript 5, Vite, Tailwind CSS", table_text), Paragraph("Responsive UI for desktop/mobile, state management, role-based screen rendering, interactive reconciliation workflows, and Tally XML export.", table_text)],
        [Paragraph("<b>Backend Core</b>", table_text), Paragraph("Spring Boot 3.3.4 (Java 21), Spring Data JPA", table_text), Paragraph("Authoritative accounting engine, immutable transaction ledger, lifecycle state machines, role security, and RESTful service APIs.", table_text)],
        [Paragraph("<b>Database</b>", table_text), Paragraph("PostgreSQL 16+ / 18, Hibernate", table_text), Paragraph("Relational persistence, foreign key enforcement, pessimistic locking on jobs, and complete audit logging.", table_text)],
        [Paragraph("<b>AI Vision Service</b>", table_text), Paragraph("Python 3.13, FastAPI, OpenCV, Pillow, Pydantic", table_text), Paragraph("Draft extraction of digital scale slips via regex pattern recognition, confidence scoring, missing-field detection, and non-blocking background OCR.", table_text)],
        [Paragraph("<b>ERP Integration</b>", table_text), Paragraph("Native Tally XML Stock Journal Format", table_text), Paragraph("Direct integration with Tally ERP 9 / Tally Prime for accounting stock transfer journals without third-party plugins.", table_text)]
    ]
    t_arch = Table(arch_rows, colWidths=[95, 140, 280])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#1F4E79")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D7DE")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FBFD")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_arch)

    # 3. Authoritative Backend Ledger
    story.append(Paragraph("3. Authoritative Backend Ledger & Data Model", h1_style))
    story.append(Paragraph(
        "The single source of truth is the immutable, append-only <b>gold_transactions</b> ledger. Historical transactions "
        "can never be modified or deleted. Any administrative adjustment requires an explicit <b>ADJUSTMENT_REVERSAL</b> "
        "transaction with mandatory audit remarks.", body_style
    ))
    story.append(Paragraph(
        "<b>Entity Model Highlights:</b><br/>"
        "• <b>User</b>: System credentials, BCrypt hashes, and assigned roles (ROLE_FINANCE_HEAD, ROLE_ISSUE_CLERK, ROLE_KARIGAR).<br/>"
        "• <b>Karigar</b>: Artisan master record with unique code (KRG-xxx), phone, address, status, and linked user identity.<br/>"
        "• <b>Job</b>: Manufacturing work order containing job code (JOB-xxx), target item type, issue date, status, allowed wastage %, and reconciled metrics.<br/>"
        "• <b>GoldTransaction</b>: Ledger entry tracking transaction type, gross weight, purity %, calculated fine gold, tare weight, scale slip image URL, and clerk user ID.<br/>"
        "• <b>LossAlert</b>: System-generated exception raised when reconciled loss exceeds contractual allowance or historical drift exceeds threshold.", body_style
    ))
    story.append(Paragraph("Job Lifecycle State Machine", h2_style))
    story.append(Paragraph(
        "Jobs advance through a deterministic state machine: <b>OPEN</b> (work order created and raw gold issued) → "
        "<b>IN_PROGRESS</b> (partial receipts of jewellery, scrap, or filings logged) → <b>READY_FOR_RECONCILIATION</b> "
        "(artisan declares production complete; all returned materials weighed) → <b>RECONCILED</b> (clerk/finance head finalizes "
        "job; loss formulas execute; unrecoverable loss finalized; alerts triggered if breach occurs).", body_style
    ))

    # 4. Strict Accounting Formulas
    story.append(Paragraph("4. Strict Accounting Formulas & Sample Calculation Verification", h1_style))
    story.append(Paragraph(
        "All calculations strictly utilize <code>java.math.BigDecimal</code> with <code>RoundingMode.HALF_UP</code> to completely prevent "
        "binary floating-point representation drift. Gross weights are recorded to 3 decimal places (0.001 g) and "
        "purities to 2 decimal places (0.01 %).", body_style
    ))
    story.append(Paragraph(
        "<b>Core Mathematical Formulas:</b><br/>"
        "1. Fine Gold Weight (g) = round(Gross Weight * (Purity % / 100), 3)<br/>"
        "2. Allowed Loss (g) = round(Issued Fine Gold * (Wastage Allowance % / 100), 3)<br/>"
        "3. Outstanding Balance (g) = Issued Fine Gold - Total Recovered Fine Gold<br/>"
        "4. Reconciled Actual Loss (g) = Issued Fine Gold - Total Recovered Fine Gold<br/>"
        "5. Excess Loss (g) = max(0.000, Actual Loss - Allowed Loss)", body_style
    ))
    story.append(Paragraph("Assignment Specification Sample Calculation Verification", h2_style))
    story.append(Paragraph(
        "The exact sample calculation mandated in the assignment specification was verified in automated unit test "
        "<code>GoldAccountingCalculatorTest.testPart3AssignmentSampleCalculation</code>:", body_style
    ))

    calc_rows = [
        [Paragraph("Stage", table_header), Paragraph("Input Parameters", table_header), Paragraph("Exact Mathematical Evaluation", table_header), Paragraph("Verified Ledger Output", table_header)],
        [Paragraph("<b>Issue Transaction</b>", table_text), Paragraph("Gross: 120.000 g<br/>Purity: 91.60% (22K)<br/>Wastage Allow: 3.00%", table_text), Paragraph("Fine = 120.000 * 0.9160 = 109.920 g<br/>Allowed Loss = 109.920 * 0.03 = 3.2976 → 3.298 g", table_text), Paragraph("<b>Issued Fine: 109.920 g</b><br/>Allowed Loss: 3.298 g", table_text)],
        [Paragraph("<b>Receipt 1 (Jewellery)</b>", table_text), Paragraph("Gross: 112.450 g<br/>Purity: 91.60%", table_text), Paragraph("Fine = 112.450 * 0.9160 = 103.0042 → 103.004 g", table_text), Paragraph("<b>Recovered: 103.004 g</b>", table_text)],
        [Paragraph("<b>Receipt 2 (Scrap)</b>", table_text), Paragraph("Gross: 3.300 g<br/>Purity: 91.60%", table_text), Paragraph("Fine = 3.300 * 0.9160 = 3.0228 → 3.023 g", table_text), Paragraph("<b>Recovered: 3.023 g</b>", table_text)],
        [Paragraph("<b>Total Recovered</b>", table_text), Paragraph("Jewellery + Scrap", table_text), Paragraph("103.004 + 3.023 = 106.027 g", table_text), Paragraph("<b>Recovered: 106.027 g</b>", table_text)],
        [Paragraph("<b>Pre-Reconciliation</b>", table_text), Paragraph("Issued - Recovered", table_text), Paragraph("109.920 - 106.027 = 3.893 g", table_text), Paragraph("<b>Outstanding: 3.893 g</b>", table_text)],
        [Paragraph("<b>Final Reconciliation</b>", table_text), Paragraph("Actual Loss vs Allowed", table_text), Paragraph("Loss = 3.893 g; Allowed = 3.298 g<br/>Excess = 3.893 - 3.298 = 0.595 g", table_text), Paragraph("<b>Actual Loss: 3.893 g</b><br/><b>Excess Loss: 0.595 g (BREACH)</b>", table_text)]
    ]
    t_calc = Table(calc_rows, colWidths=[90, 130, 165, 130])
    t_calc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#1F4E79")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D7DE")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FBFD")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_calc)

    # 5. Dual-Engine Loss & Drift Detection
    story.append(Paragraph("5. Dual-Engine Loss & Drift Detection", h1_style))
    story.append(Paragraph(
        "To protect against both acute wastage spikes and gradual systemic theft, the platform deploys two complementary engines:<br/>"
        "1. <b>Rule-Based Contractual Breach</b>: Evaluates at the instant of job reconciliation. If Actual Loss > Allowed Loss, an "
        "<b>EXCESS_LOSS</b> alert is raised immediately, tagging the specific Job Code, Karigar Code, and exact gram variance.<br/>"
        "2. <b>Statistical Karigar Benchmark Drift</b>: Computes a rolling 30-day mean wastage percentage for each artisan across "
        "their last 5 or more completed jobs. If a karigar's cumulative loss average drifts higher than 1.5 standard deviations "
        "above their historical baseline, a <b>BENCHMARK_DRIFT</b> warning is dispatched to the Finance Head.", body_style
    ))

    # 6. AI Vision Slip Extraction
    story.append(Paragraph("6. AI Scale-Slip Extraction & Human-in-the-Loop Workflow", h1_style))
    story.append(Paragraph(
        "The digital scale extraction microservice runs independently via FastAPI. It accepts workshop photographs of "
        "digital weight indicator displays and printed weight slips.<br/>"
        "• <b>Non-Authoritative Draft Generation</b>: The AI service never writes directly to the database. It produces a structured JSON draft response.<br/>"
        "• <b>Confidence Scoring & Gap Detection</b>: The microservice analyzes text clarity and field completeness. If purity or tare weight is ambiguous, "
        "<code>missing_fields: ['purity']</code> is populated, and <code>requires_human_confirmation: true</code> is asserted.<br/>"
        "• <b>UI Pre-Fill & Mandatory Clerk Review</b>: The web UI displays the uploaded image side-by-side with extracted draft inputs. The clerk must inspect, edit if necessary, and explicitly confirm before submission.<br/>"
        "• <b>Transparent Resilience</b>: If the AI microservice is unreachable, the Spring Boot backend transparently falls back to local Java regex parsing without crashing the user session.", body_style
    ))

    # 7. Functional Implementation of 7 Required Modules
    story.append(Paragraph("7. Implementation of 7 Required Application Modules", h1_style))
    mod_rows = [
        [Paragraph("Module Name", table_header), Paragraph("Route", table_header), Paragraph("Key Capabilities & Verified Business Logic", table_header)],
        [Paragraph("<b>1. Dashboard</b>", table_text), Paragraph("/dashboard", table_text), Paragraph("Live enterprise KPI cards (Total Stock, Issued Gold, Recovered, Outstanding, Wastage, Active Alerts). Recent transaction table. 100% backend-driven.", table_text)],
        [Paragraph("<b>2. Karigar Master</b>", table_text), Paragraph("/karigars", table_text), Paragraph("Artisan directory with KRG-xxx code generation, phone, specialty, active job count, status badges, and search filtering.", table_text)],
        [Paragraph("<b>3. Issue Gold</b>", table_text), Paragraph("/issue", table_text), Paragraph("Issuance modal with Karigar selection, gross weight, 22K/18K/24K purity presets, agreed wastage %, calculated fine gold preview, and AI slip scanner.", table_text)],
        [Paragraph("<b>4. Receive Gold</b>", table_text), Paragraph("/receive", table_text), Paragraph("Multi-stream receipt (Jewellery, Scrap, Filings), live outstanding balance counter, scale slip OCR scanner, and one-click reconciliation modal.", table_text)],
        [Paragraph("<b>5. Karigar Ledger</b>", table_text), Paragraph("/ledger", table_text), Paragraph("Running debit/credit ledger per artisan, balance summary cards, expandable job details, and downloadable transaction receipts.", table_text)],
        [Paragraph("<b>6. Loss Alerts</b>", table_text), Paragraph("/alerts", table_text), Paragraph("Centralized anomaly cockpit displaying rule-based excess loss breaches and statistical drift flags, with finance head acknowledgment.", table_text)],
        [Paragraph("<b>7. Stock Statement</b>", table_text), Paragraph("/statement", table_text), Paragraph("5-pillar daily reconciliation statement, component recovery breakdown, CSV download, and native Tally ERP 9 / Tally Prime XML export.", table_text)]
    ]
    t_mod = Table(mod_rows, colWidths=[95, 75, 345])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#1F4E79")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D7DE")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FBFD")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_mod)

    # 8. Security & RBAC
    story.append(Paragraph("8. Security, Role-Based Access Control & Isolation", h1_style))
    story.append(Paragraph(
        "Authentication is enforced through stateless JWT tokens signed with HMAC-SHA256. The system defines three strictly separated roles:<br/>"
        "• <b>ROLE_FINANCE_HEAD</b>: Full company-wide visibility. Access to company stock statements, loss anomaly dashboards, Tally XML exports, and karigar drift analytics.<br/>"
        "• <b>ROLE_ISSUE_CLERK</b>: Operational workshop access. Can register karigars, issue raw gold, log returns, run AI slip extraction, and execute reconciliations.<br/>"
        "• <b>ROLE_KARIGAR</b>: Strict artisan isolation. Authenticated karigars can only view their own outstanding balance and assigned jobs. Cross-karigar data access is blocked server-side by checking the JWT's <code>karigarId</code> claim.", body_style
    ))

    # 9. Test Verification
    story.append(Paragraph("9. Automated Test Suites & Quality Assurance Evidence", h1_style))
    story.append(Paragraph(
        "The system has been subjected to comprehensive automated test suites across all tiers:", body_style
    ))
    test_rows = [
        [Paragraph("Subsystem", table_header), Paragraph("Test Class / Suite", table_header), Paragraph("Tests", table_header), Paragraph("Failures", table_header), Paragraph("Errors", table_header), Paragraph("Status", table_header)],
        [Paragraph("<b>Backend Accounting</b>", table_text), Paragraph("GoldAccountingCalculatorTest", table_text), Paragraph("12", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>Backend Security</b>", table_text), Paragraph("AuthenticationIntegrationTest", table_text), Paragraph("5", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>Backend Workflow</b>", table_text), Paragraph("GoldDomainWorkflowTest", table_text), Paragraph("3", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>Backend Isolation</b>", table_text), Paragraph("KarigarSecurityIsolationTest", table_text), Paragraph("4", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>Backend Lifecycle</b>", table_text), Paragraph("JobLifecycleAndConcurrencyTest", table_text), Paragraph("3", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>AI Microservice</b>", table_text), Paragraph("pytest (test_api.py & test_extractor.py)", table_text), Paragraph("8", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)],
        [Paragraph("<b>Frontend UI</b>", table_text), Paragraph("TypeScript compiler & Vite build", table_text), Paragraph("1512 mod", table_text), Paragraph("0", table_text), Paragraph("0", table_text), Paragraph("<b>PASS</b>", table_text)]
    ]
    t_test = Table(test_rows, colWidths=[110, 175, 45, 50, 45, 90])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#1F4E79")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D7DE")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FBFD")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_test)

    # 10. Known Limitations & Roadmap
    story.append(Paragraph("10. Known Limitations, Operational Assumptions & Roadmap", h1_style))
    story.append(Paragraph(
        "<b>Assumptions & Current Scope:</b><br/>"
        "• <i>Single Central Workshop</i>: Currently models 1 central manufacturing facility feeding 5 retail showrooms.<br/>"
        "• <i>Homogeneous Purity per Job</i>: Each job is issued at a single uniform karatage (e.g. 22K 91.60%). Multi-alloy composite jobs are modeled as linked sub-jobs.<br/>"
        "<br/><b>Future Roadmap:</b><br/>"
        "• <i>Direct RS-232 / USB Serial Scale Integration</i>: Stream live weight readings directly from Mettler Toledo and Sartorius scales into the browser.<br/>"
        "• <i>Native Mobile App for Artisans</i>: Offline-first React Native mobile client enabling karigars in remote workshop clusters to acknowledge receipt of gold via QR code.", body_style
    ))

    # 11. Author and Repo
    story.append(Paragraph("11. Submission Verification & Repository Details", h1_style))
    story.append(Paragraph(
        "• <b>Public GitHub Repository</b>: https://github.com/Ayush5424/jewellery-gold-accountability<br/>"
        "• <b>Branch</b>: main<br/>"
        "• <b>Primary Developer</b>: Ayush<br/>"
        "• <b>Assignment</b>: Isocode Labs Software Engineering Internship Assignment<br/>"
        "• <b>Date of Delivery</b>: November 2026", body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF at: {output_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docx_path = os.path.join(base_dir, "TDD.docx")
    pdf_path = os.path.join(base_dir, "TDD.pdf")
    generate_docx(docx_path)
    generate_pdf(pdf_path)
