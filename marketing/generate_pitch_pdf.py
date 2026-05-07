"""Generate the Trainer Pro pitch PDF for Dee Fitness.

Run from the backend venv (has reportlab):
    cd C:\\Users\\chaya\\Downloads\\trainer-pro\\backend
    .\\venv\\Scripts\\python.exe ..\\marketing\\generate_pitch_pdf.py

Outputs:
    marketing/Trainer-Pro-for-Dee-Fitness.pdf  (3 pages)
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ---------- brand ---------------------------------------------------------
BRAND = HexColor("#0f766e")        # teal — feels healthy + premium
BRAND_DARK = HexColor("#0a544f")
ACCENT = HexColor("#f59e0b")       # amber — CTAs
INK = HexColor("#0f172a")
SUB = HexColor("#475569")
MUTED = HexColor("#94a3b8")
BG_LIGHT = HexColor("#f8fafc")
BG_CARD = HexColor("#ffffff")
SUCCESS = HexColor("#16a34a")

# ---------- styles --------------------------------------------------------
styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=34,
    leading=38,
    textColor=INK,
    spaceAfter=14,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=20,
    leading=24,
    textColor=INK,
    spaceAfter=10,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    textColor=BRAND_DARK,
    spaceAfter=4,
)
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10,
    leading=15,
    textColor=INK,
    spaceAfter=8,
)
BODY_SUB = ParagraphStyle(
    "BodySub",
    parent=BODY,
    textColor=SUB,
)
EYEBROW = ParagraphStyle(
    "Eyebrow",
    parent=BODY,
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=BRAND,
    spaceAfter=6,
)
LEAD = ParagraphStyle(
    "Lead",
    parent=BODY,
    fontSize=12,
    leading=18,
    textColor=SUB,
    spaceAfter=14,
)
QUOTE = ParagraphStyle(
    "Quote",
    parent=BODY,
    fontSize=14,
    leading=20,
    textColor=INK,
    fontName="Helvetica-Oblique",
    leftIndent=12,
    spaceAfter=8,
)
WHITE_H1 = ParagraphStyle(
    "WhiteH1",
    parent=H1,
    textColor=colors.white,
)
WHITE_LEAD = ParagraphStyle(
    "WhiteLead",
    parent=LEAD,
    textColor=HexColor("#e2e8f0"),
)
WHITE_EYEBROW = ParagraphStyle(
    "WhiteEyebrow",
    parent=EYEBROW,
    textColor=HexColor("#fcd34d"),
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontSize=8,
    leading=11,
    textColor=MUTED,
)


# ---------- canvas helpers -----------------------------------------------
def _page_decoration_cover(canv: canvas.Canvas, doc) -> None:
    """Hero band on page 1."""
    w, h = LETTER
    # Top brand band
    canv.setFillColor(BRAND)
    canv.rect(0, h - 2.6 * inch, w, 2.6 * inch, fill=1, stroke=0)
    canv.setFillColor(BRAND_DARK)
    # decorative accent stripe
    canv.rect(0, h - 2.6 * inch, w, 0.08 * inch, fill=1, stroke=0)
    # Logo / brand mark
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawString(0.6 * inch, h - 0.55 * inch, "TRAINER  PRO")
    canv.setFont("Helvetica", 9)
    canv.drawString(0.6 * inch, h - 0.75 * inch, "The operating system for personal trainers")
    # Date right
    canv.setFillColor(HexColor("#cbd5e1"))
    canv.setFont("Helvetica", 9)
    canv.drawRightString(w - 0.6 * inch, h - 0.55 * inch, f"Prepared {date.today():%B %Y}")


def _page_decoration_inner(canv: canvas.Canvas, doc) -> None:
    """Slim header + footer on inner pages."""
    w, h = LETTER
    # Top thin band
    canv.setFillColor(BRAND)
    canv.rect(0, h - 0.18 * inch, w, 0.18 * inch, fill=1, stroke=0)
    # Brand mark
    canv.setFillColor(SUB)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawString(0.6 * inch, h - 0.42 * inch, "TRAINER  PRO")
    canv.setFont("Helvetica", 8)
    canv.drawRightString(w - 0.6 * inch, h - 0.42 * inch, f"Page {doc.page}")
    # Footer
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 7.5)
    canv.drawString(0.6 * inch, 0.45 * inch, "Trainer Pro · Run your training business in one place")
    canv.drawRightString(w - 0.6 * inch, 0.45 * inch, "trainer-pro.app")


def hr(width: float = 5.5 * inch, color=HexColor("#e2e8f0")):
    """Returns a flowable that draws a thin horizontal rule."""
    from reportlab.platypus import HRFlowable
    return HRFlowable(width=width, thickness=0.7, color=color, spaceBefore=8, spaceAfter=10)


def card(rows, col_widths, padding=(8, 8, 8, 8), bg=BG_CARD, border=HexColor("#e2e8f0")):
    """Wrap a Table with card-style padding and border."""
    t = Table(rows, colWidths=col_widths)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("BOX", (0, 0), (-1, -1), 0.5, border),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), padding[0]),
                ("RIGHTPADDING", (0, 0), (-1, -1), padding[1]),
                ("TOPPADDING", (0, 0), (-1, -1), padding[2]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), padding[3]),
            ]
        )
    )
    return t


# ---------- page 1: cover -------------------------------------------------
def page_one() -> list:
    flow = []

    # Spacer to clear hero band
    flow.append(Spacer(1, 1.5 * inch))

    flow.append(Paragraph("PREPARED FOR DEE FITNESS", WHITE_EYEBROW))
    flow.append(Paragraph("Your site stays.<br/>Everything behind it gets better.", WHITE_H1))
    flow.append(Spacer(1, 0.6 * inch))  # push past the brand band

    # First section under the band
    flow.append(Spacer(1, 0.1 * inch))
    flow.append(Paragraph("Hi Dee &mdash;", H2))
    flow.append(
        Paragraph(
            "Your <b>dee-fitness.com</b> already does the hard part: it tells your story, shows "
            "your work, and brings clients in. What it doesn&rsquo;t do — what no marketing site "
            "can do alone — is run the day-to-day business behind it. That&rsquo;s where Trainer "
            "Pro comes in.",
            BODY,
        )
    )
    flow.append(
        Paragraph(
            "We&rsquo;re a complete operating system for solo trainers and small studios: "
            "scheduling, payments, workout plans, progress tracking, an automatic client portal, "
            "and a polished public profile that picks up where your existing site leaves off. "
            "<b>Your domain stays. Your brand stays. Your clients stay.</b> The mess underneath "
            "all of it goes away.",
            BODY,
        )
    )

    flow.append(Spacer(1, 0.18 * inch))
    flow.append(hr())
    flow.append(Spacer(1, 0.1 * inch))

    # Big value props grid (2x2)
    cell_style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]
    )

    def value_card(num, title, body):
        return [
            Paragraph(f"<b><font color='#0f766e' size='18'>{num}</font></b>", BODY),
            Paragraph(f"<b>{title}</b>", H3),
            Paragraph(body, BODY_SUB),
        ]

    cards = [
        [
            value_card(
                "01",
                "Booking that actually books",
                "A client clicks &ldquo;Book&rdquo; on dee-fitness.com and 90 seconds later you have a paid session on your calendar — slot picker, intake form, and Stripe checkout in one flow.",
            ),
            value_card(
                "02",
                "Every session, every payment, one place",
                "Drag-and-drop calendar, recurring sessions, package balance auto-decrement, payment history per client. No spreadsheet, no DMs.",
            ),
        ],
        [
            value_card(
                "03",
                "Workout plans + a real client portal",
                "Build programs from a 50-exercise library, assign to clients, log results live during sessions. Clients log in to see their schedule, balance, and progress.",
            ),
            value_card(
                "04",
                "Studio mode for when you grow",
                "Add a second trainer in a click. They get their own clients, you see the whole business. Built in, no extra tier.",
            ),
        ],
    ]
    table = Table(cards, colWidths=[3.0 * inch, 3.0 * inch], rowHeights=[1.6 * inch, 1.6 * inch])
    table.setStyle(cell_style)
    flow.append(table)

    flow.append(Spacer(1, 0.18 * inch))

    # Closing line on cover
    flow.append(
        Paragraph(
            "<b>15 minutes on Zoom.</b> I&rsquo;ll show you the demo. If you don&rsquo;t see "
            "something you&rsquo;d use, no hard feelings.",
            LEAD,
        )
    )

    return flow


# ---------- page 2: comparison + features ---------------------------------
def page_two() -> list:
    flow = []
    flow.append(Spacer(1, 0.1 * inch))
    flow.append(Paragraph("WHAT CHANGES", EYEBROW))
    flow.append(Paragraph("Your site, before and after", H2))
    flow.append(
        Paragraph(
            "dee-fitness.com today is a static brochure: visitors learn about you, then leave to "
            "book another way. With Trainer Pro behind it, the same domain becomes a full "
            "self-serve experience — discovery, booking, intake, payment, training, and "
            "follow-up — without breaking the look you&rsquo;ve built.",
            BODY_SUB,
        )
    )
    flow.append(Spacer(1, 0.15 * inch))

    # Comparison table
    compare_rows = [
        ["", Paragraph("<b>dee-fitness.com today</b>", BODY), Paragraph("<b>+ Trainer Pro</b>", BODY)],
        [Paragraph("<b>Booking a session</b>", BODY), "Email or DM", "Slot picker + intake + payment in one flow"],
        [Paragraph("<b>New client onboarding</b>", BODY), "Manual back-and-forth", "Auto-sent intake link with PAR-Q + e-signature"],
        [Paragraph("<b>Payments</b>", BODY), "Cash, e-Transfer, Venmo", "Stripe Checkout + auto-recorded payments + package balance"],
        [Paragraph("<b>Workout plans</b>", BODY), "Google Docs / paper", "Drag-drop builder, 50+ exercises, in-session logger"],
        [Paragraph("<b>Progress tracking</b>", BODY), "Memory + photos on phone", "Charts per metric, before/after photos, PRs"],
        [Paragraph("<b>Client schedule access</b>", BODY), "Ask Dee", "Branded portal — login, see upcoming, request reschedule"],
        [Paragraph("<b>Bringing on staff</b>", BODY), "Build a new system", "Studio mode, on by default — each trainer their own clients"],
    ]
    compare = Table(compare_rows, colWidths=[1.7 * inch, 2.0 * inch, 2.4 * inch])
    compare.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("LINEBELOW", (0, 0), (-1, 0), 1, BRAND),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 1), (-1, -1), 0.4, HexColor("#e2e8f0")),
                ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ]
        )
    )
    flow.append(compare)

    flow.append(Spacer(1, 0.25 * inch))

    # Feature inventory in a 2-column grid
    flow.append(Paragraph("FEATURE SET", EYEBROW))
    flow.append(Paragraph("Everything that&rsquo;s included", H2))
    flow.append(Spacer(1, 0.05 * inch))

    feature_pairs = [
        ("Public profile site", "Hero, about, services, gallery, testimonials, contact"),
        ("Drag-drop calendar", "Week + month views, recurring sessions, conflict detection"),
        ("Public booking page", "Per-trainer slug, availability rules, slot picker"),
        ("Stripe Checkout", "Buy a package, auto-record + bump client balance"),
        ("Intake form + e-sig", "PAR-Q waiver, signed PDF stored automatically"),
        ("Client portal", "Schedule, balance, history, request-reschedule"),
        ("Workout builder", "50+ exercise library + custom, sets/reps/rest"),
        ("In-session logger", "Per-set Reps/Weight/RPE, links to plan"),
        ("Progress + photos", "Line charts per metric, before/after gallery"),
        ("Studio mode", "Multi-trainer with owner overview"),
        ("Stripe webhooks", "Refund handling, idempotent payment recording"),
        ("Reminders (in progress)", "SMS via Twilio, email via Resend"),
    ]
    rows = []
    pair_iter = iter(feature_pairs)
    for left in pair_iter:
        try:
            right = next(pair_iter)
        except StopIteration:
            right = ("", "")
        rows.append(
            [
                Paragraph(f"<b>{left[0]}</b><br/><font size='9' color='#475569'>{left[1]}</font>", BODY),
                Paragraph(f"<b>{right[0]}</b><br/><font size='9' color='#475569'>{right[1]}</font>", BODY),
            ]
        )
    grid = Table(rows, colWidths=[3.1 * inch, 3.0 * inch])
    grid.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    flow.append(grid)

    return flow


# ---------- page 3: demo flow + pricing + CTA ----------------------------
def page_three() -> list:
    flow = []
    flow.append(Spacer(1, 0.1 * inch))
    flow.append(Paragraph("THE DEMO", EYEBROW))
    flow.append(Paragraph("Here&rsquo;s what a 15-minute walkthrough covers", H2))
    flow.append(Spacer(1, 0.05 * inch))

    steps = [
        ("1", "Your public profile",
         "We open your branded /p/dee-fitness page — hero, about, services, gallery, testimonials. Your colors, your photos. (Or: your existing dee-fitness.com keeps running and we just plug in behind.)"),
        ("2", "A real client books",
         "From the public site, click “Book a session.” Slot picker shows your real availability. Select Tuesday 9 AM, 60 min, fill the intake form, sign the waiver. Done in 90 seconds."),
        ("3", "Stripe takes the money",
         "Same flow shows the package options. They pick a 10-pack, click pay, enter card. Your back-office dashboard now shows the new payment + package balance bumped by 10."),
        ("4", "You build a workout",
         "Open the new client&rsquo;s page. Click “Assign workout.” Pick exercises from the library (or build custom). Save. They can see it in their portal."),
        ("5", "Live session",
         "On Tuesday morning the session is on the calendar. You open it, click “Log workout,” punch in actual reps and weight as you train. Saved."),
        ("6", "Progress + portal",
         "Months in, you&rsquo;ve logged her weight, body fat, PRs. Charts auto-build in the Progress tab. She can see her own data anytime."),
    ]
    step_rows = []
    for num, title, desc in steps:
        step_rows.append(
            [
                Paragraph(
                    f"<font color='#0f766e' size='22'><b>{num}</b></font>",
                    BODY,
                ),
                [
                    Paragraph(f"<b>{title}</b>", H3),
                    Paragraph(desc, BODY_SUB),
                ],
            ]
        )
    steps_table = Table(step_rows, colWidths=[0.5 * inch, 5.6 * inch])
    steps_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, HexColor("#e2e8f0")),
            ]
        )
    )
    flow.append(steps_table)

    flow.append(Spacer(1, 0.2 * inch))

    # Pricing strip
    flow.append(Paragraph("WHAT IT COSTS", EYEBROW))

    price_inner = [
        [
            Paragraph(
                "<font size='28' color='#0f172a'><b>$30</b></font><font size='12' color='#475569'> / month</font>",
                BODY,
            ),
            Paragraph(
                "Includes everything on this page. No long-term contract. Pause or cancel any "
                "time. Stripe processing fees pass through at standard rates (2.9% + 30&cent;). "
                "Studio mode &mdash; same price up to 3 trainers.",
                BODY_SUB,
            ),
        ]
    ]
    price_box = Table(price_inner, colWidths=[1.5 * inch, 4.5 * inch])
    price_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, BRAND),
                ("LINEABOVE", (0, 0), (-1, 0), 3, BRAND),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    flow.append(price_box)

    flow.append(Spacer(1, 0.2 * inch))

    # Final CTA — dark band
    flow.append(Paragraph("NEXT STEP", EYEBROW))
    cta_inner = [
        [
            Paragraph(
                "<font size='20' color='white'><b>15 minutes. Live demo. Your domain, your branding.</b></font>",
                BODY,
            ),
        ],
        [
            Paragraph(
                "<font size='10' color='#cbd5e1'>Pick a time and I&rsquo;ll come to your screen. "
                "If you don&rsquo;t walk away thinking &ldquo;this would save me 5 hours a "
                "week,&rdquo; we go separate ways. Either way you&rsquo;ll have seen what&rsquo;s "
                "possible.</font>",
                BODY,
            ),
        ],
    ]
    cta = Table(cta_inner, colWidths=[6.0 * inch])
    cta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), INK),
                ("BOX", (0, 0), (-1, -1), 0.5, INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 22),
                ("RIGHTPADDING", (0, 0), (-1, -1), 22),
                ("TOPPADDING", (0, 0), (-1, -1), 22),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    flow.append(cta)

    flow.append(Spacer(1, 0.15 * inch))
    flow.append(
        Paragraph(
            "Reply to this email, or text me directly. I&rsquo;ll send a demo URL same day.",
            BODY,
        )
    )

    return flow


# ---------- main ---------------------------------------------------------
def build(out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Two page templates: cover and inner
    cover_frame = Frame(
        0.6 * inch,
        0.6 * inch,
        LETTER[0] - 1.2 * inch,
        LETTER[1] - 1.2 * inch,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        showBoundary=0,
    )
    inner_frame = Frame(
        0.6 * inch,
        0.6 * inch,
        LETTER[0] - 1.2 * inch,
        LETTER[1] - 1.2 * inch,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        showBoundary=0,
    )

    doc = BaseDocTemplate(
        str(out_path),
        pagesize=LETTER,
        title="Trainer Pro for Dee Fitness",
        author="Trainer Pro",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[cover_frame], onPage=_page_decoration_cover),
            PageTemplate(id="inner", frames=[inner_frame], onPage=_page_decoration_inner),
        ]
    )

    flow = []
    flow.extend(page_one())
    # Switch templates explicitly
    from reportlab.platypus import PageBreak, NextPageTemplate

    flow.append(NextPageTemplate("inner"))
    flow.append(PageBreak())
    flow.extend(page_two())
    flow.append(PageBreak())
    flow.extend(page_three())

    doc.build(flow)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    here = Path(__file__).resolve().parent
    out = here / "Trainer-Pro-for-Dee-Fitness.pdf"
    build(out)
