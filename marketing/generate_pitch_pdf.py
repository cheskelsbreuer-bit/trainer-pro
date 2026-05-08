"""Generate the Trainer Pro pitch PDF for Zalmen at Dee Fitness.

Premium 5-page brochure with embedded real screenshots of both the public
marketing site (front-end) and the operator back-office. Screenshots are
captured separately by polish_and_capture.py / final_recapture.py and saved
in marketing/screenshots/.

Run from anywhere — paths are absolute:
    .\\backend\\venv\\Scripts\\python.exe .\\marketing\\generate_pitch_pdf.py

Output:
    marketing/Trainer-Pro-for-Dee-Fitness.pdf  (5 pages)
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from io import BytesIO

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    NextPageTemplate,
    Image,
    HRFlowable,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

# ----------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent
SHOTS = HERE / "screenshots"
OUT = HERE / "Trainer-Pro-for-Dee-Fitness.pdf"

# Brand colors — same teal/amber the app uses
BRAND = HexColor("#0f766e")
BRAND_DARK = HexColor("#0a544f")
BRAND_LIGHT = HexColor("#ccfbf1")
ACCENT = HexColor("#f59e0b")
INK = HexColor("#0f172a")
SUB = HexColor("#475569")
MUTED = HexColor("#94a3b8")
BG_LIGHT = HexColor("#f8fafc")
BG_CARD = HexColor("#ffffff")
BORDER = HexColor("#e2e8f0")


# ---- styles -----------------------------------------------------------------
styles = getSampleStyleSheet()


def style(name, **kw):
    kw.setdefault("fontName", "Helvetica")
    return ParagraphStyle(name, parent=styles["BodyText"], **kw)


H_HERO = style("HHero", fontSize=42, leading=46, fontName="Helvetica-Bold",
               textColor=colors.white, spaceAfter=10)
H_PAGE = style("HPage", fontSize=26, leading=30, fontName="Helvetica-Bold",
               textColor=INK, spaceAfter=8)
H_SECT = style("HSect", fontSize=16, leading=20, fontName="Helvetica-Bold",
               textColor=INK, spaceAfter=4)
H_CARD = style("HCard", fontSize=11, leading=14, fontName="Helvetica-Bold",
               textColor=BRAND_DARK, spaceAfter=2)
EYEBROW = style("Eyebrow", fontSize=8.5, leading=11, fontName="Helvetica-Bold",
                textColor=BRAND, spaceAfter=6)
EYEBROW_WHITE = style("EyebrowWhite", fontSize=8.5, leading=11, fontName="Helvetica-Bold",
                      textColor=HexColor("#fcd34d"), spaceAfter=8)
EYEBROW_LIGHT = style("EyebrowLight", fontSize=8.5, leading=11, fontName="Helvetica-Bold",
                      textColor=HexColor("#a7f3d0"), spaceAfter=6)
LEAD = style("Lead", fontSize=11.5, leading=17, textColor=SUB, spaceAfter=10)
LEAD_WHITE = style("LeadWhite", fontSize=12, leading=18,
                   textColor=HexColor("#e2e8f0"), spaceAfter=10)
BODY = style("Body", fontSize=10, leading=14.5, textColor=INK, spaceAfter=6)
BODY_SUB = style("BodySub", fontSize=9.5, leading=14, textColor=SUB, spaceAfter=6)
BODY_SMALL = style("BodySmall", fontSize=8.5, leading=12, textColor=SUB, spaceAfter=4)
CAPTION = style("Caption", fontSize=8, leading=11, textColor=MUTED,
                fontName="Helvetica-Oblique", spaceAfter=2)
SIGNATURE = style("Sig", fontSize=10.5, leading=14, fontName="Helvetica-Oblique",
                  textColor=SUB, spaceAfter=4)
QUOTE_WHITE = style("Quote", fontSize=14, leading=20, textColor=colors.white,
                    fontName="Helvetica-Bold", spaceAfter=10)


# ---- screenshot helpers -----------------------------------------------------
def crop_image(src: Path, *, top: int = 0, bottom: int = 0,
               left: int = 0, right: int = 0) -> BytesIO:
    """Return BytesIO of `src` cropped by the given pixel margins.

    Pixel margins are at the image's native resolution
    (1440x900 logical * device_scale_factor=2 → 2880x1800).
    """
    img = PILImage.open(src)
    w, h = img.size
    box = (left, top, w - right, h - bottom)
    cropped = img.crop(box)
    buf = BytesIO()
    cropped.save(buf, format="PNG")
    buf.seek(0)
    return buf


def shot(fname: str, *, width: float, **crop_kw) -> Image:
    """Load a screenshot, optionally crop, and scale to PDF width.

    `width` in inches (will be converted to points internally by reportlab).
    """
    src = SHOTS / fname
    if not src.exists():
        raise FileNotFoundError(src)
    if crop_kw:
        buf = crop_image(src, **crop_kw)
        # Need width-aware loading: open via PIL to compute aspect, then load
        pil = PILImage.open(buf)
        aspect = pil.height / pil.width
        buf.seek(0)
        return Image(buf, width=width * inch, height=width * inch * aspect)
    pil = PILImage.open(src)
    aspect = pil.height / pil.width
    return Image(str(src), width=width * inch, height=width * inch * aspect)


# Pre-compute crops we know we want:
#   * Sidebar pages crop ~85px off the bottom to hide "phase3+...@train…" + Sign out
#   * Dashboard crops bottom 540px to hide the empty "Recent clients" widget
#     while keeping KPIs, Revenue trend, Recent session notes, and the top
#     of Upcoming sessions.
SIDEBAR_BOTTOM_CROP = 170  # 2x scale → ~85 logical px of sidebar footer
DASHBOARD_BOTTOM_CROP = 540


# ---- page chrome ------------------------------------------------------------
def cover_chrome(canv: canvas.Canvas, doc) -> None:
    """Full-bleed dark cover with brand band."""
    w, h = LETTER
    # Dark slate background
    canv.setFillColor(INK)
    canv.rect(0, 0, w, h, fill=1, stroke=0)
    # Top brand band
    canv.setFillColor(BRAND)
    canv.rect(0, h - 0.3 * inch, w, 0.3 * inch, fill=1, stroke=0)
    # Tiny brand mark in band
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 9)
    canv.drawString(0.6 * inch, h - 0.2 * inch, "TRAINER  PRO")
    canv.setFont("Helvetica", 8)
    canv.drawRightString(w - 0.6 * inch, h - 0.2 * inch,
                         "The operating system for personal trainers")
    # Decorative side stripe
    canv.setFillColor(BRAND)
    canv.rect(0, 0, 0.18 * inch, h - 0.3 * inch, fill=1, stroke=0)
    # Bottom hairline + footer
    canv.setStrokeColor(HexColor("#1e293b"))
    canv.setLineWidth(0.5)
    canv.line(0.6 * inch, 0.65 * inch, w - 0.6 * inch, 0.65 * inch)
    canv.setFillColor(HexColor("#cbd5e1"))
    canv.setFont("Helvetica", 8.5)
    canv.drawString(0.6 * inch, 0.45 * inch, f"Prepared {date.today():%B %Y}")
    canv.drawRightString(w - 0.6 * inch, 0.45 * inch, "trainer-pro.app")


def inner_chrome(canv: canvas.Canvas, doc) -> None:
    """Slim header band + footer for inner pages."""
    w, h = LETTER
    # Top thin teal band
    canv.setFillColor(BRAND)
    canv.rect(0, h - 0.18 * inch, w, 0.18 * inch, fill=1, stroke=0)
    # Header brand mark
    canv.setFillColor(SUB)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawString(0.6 * inch, h - 0.42 * inch, "TRAINER  PRO")
    canv.setFont("Helvetica", 8)
    canv.drawString(1.4 * inch, h - 0.42 * inch, "·  for Dee Fitness")
    canv.setFillColor(MUTED)
    canv.drawRightString(w - 0.6 * inch, h - 0.42 * inch, f"Page {doc.page} of 5")
    # Footer hairline + tagline
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.5)
    canv.line(0.6 * inch, 0.6 * inch, w - 0.6 * inch, 0.6 * inch)
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 7.5)
    canv.drawString(0.6 * inch, 0.4 * inch,
                    "Trainer Pro · Run your training business in one place")
    canv.drawRightString(w - 0.6 * inch, 0.4 * inch, "trainer-pro.app")


# ---- PAGE 1 — COVER ---------------------------------------------------------
def page_cover() -> list:
    flow = []
    # The cover frame leaves room for the brand band; we start ~1.2in down.
    flow.append(Spacer(1, 0.5 * inch))
    flow.append(Paragraph("PREPARED FOR ZALMEN  ·  DEE FITNESS", EYEBROW_WHITE))
    flow.append(Paragraph("Your site stays.<br/>Everything behind it<br/>gets better.", H_HERO))
    flow.append(Spacer(1, 0.15 * inch))
    flow.append(Paragraph(
        "<font color='#cbd5e1'>An end-to-end operating system for Dee Fitness — "
        "scheduling, payments, programs, progress, and a polished public site — "
        "running quietly behind the brand you&rsquo;ve already built.</font>",
        LEAD_WHITE,
    ))

    flow.append(Spacer(1, 0.5 * inch))

    # In-cover preview card with the public-profile hero screenshot, framed
    preview_inner = [[shot("01-public-profile-hero.png", width=5.6)]]
    preview = Table(preview_inner, colWidths=[5.7 * inch])
    preview.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#1e293b")),
        ("BOX", (0, 0), (-1, -1), 0.7, HexColor("#334155")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    flow.append(preview)
    flow.append(Spacer(1, 0.08 * inch))
    flow.append(Paragraph(
        "<font color='#94a3b8'>Above: the same public profile, rendered live for a "
        "demo studio. Yours would carry your photography, your colors, and your "
        "domain.</font>",
        CAPTION,
    ))

    flow.append(Spacer(1, 0.4 * inch))

    flow.append(Paragraph(
        "<font color='#cbd5e1'><i>Hi Zalmen — I built this for trainers who already "
        "have the brand and the clients, and just need the back of house to keep up. "
        "Take a look. If anything inside is useful, the next step is fifteen "
        "minutes on a screen share.</i></font>",
        LEAD_WHITE,
    ))

    return flow


# ---- PAGE 2 — STORY + PUBLIC PROFILE ---------------------------------------
def page_story() -> list:
    flow = []
    flow.append(Spacer(1, 0.05 * inch))
    flow.append(Paragraph("THE OPPORTUNITY", EYEBROW))
    flow.append(Paragraph("dee-fitness.com today, and what sits behind it tomorrow.", H_PAGE))
    flow.append(Paragraph(
        "Your site already does the hard part — it tells your story, shows your work, "
        "and brings clients in. What it doesn&rsquo;t do — what no marketing site can do "
        "alone — is run the day-to-day business behind it. That&rsquo;s where Trainer Pro "
        "comes in.",
        LEAD,
    ))
    flow.append(Paragraph(
        "<b>Your domain stays. Your brand stays. Your clients stay.</b> The mess "
        "underneath all of it goes away.",
        BODY,
    ))
    flow.append(Spacer(1, 0.12 * inch))
    flow.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=12))

    # Two-column intro text (left = front of house, right = one click later).
    # Visual proof comes below as a single landscape booking screenshot.
    left_cell = [
        Paragraph("Front of house", H_SECT),
        Paragraph(
            "A public profile that visitors convert from — hero, about, package "
            "list, gallery, testimonials, contact block — all served from the "
            "content you already have. No CMS, no drag-builders, no ongoing "
            "maintenance.",
            BODY_SUB,
        ),
    ]
    right_cell = [
        Paragraph("One click later", H_SECT),
        Paragraph(
            "Click <b>Book now</b> and the same look continues into a real-time "
            "slot picker tied to your calendar. Intake form. Stripe checkout. "
            "Done in ninety seconds — without leaving the brand.",
            BODY_SUB,
        ),
    ]
    cols = Table([[left_cell, right_cell]],
                 colWidths=[3.2 * inch, 3.2 * inch])
    cols.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    flow.append(cols)

    flow.append(Spacer(1, 0.14 * inch))

    # Single landscape proof shot — booking page (already cropped naturally)
    flow.append(shot("03-booking-page.png", width=6.6))
    flow.append(Spacer(1, 0.04 * inch))
    flow.append(Paragraph(
        "Above: the booking page on a demo studio, with the same brand band as the "
        "marketing site. The package picker, intake form, and Stripe handoff all "
        "live in this single flow.",
        CAPTION,
    ))

    flow.append(Spacer(1, 0.16 * inch))

    # Three quick wins band
    win = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ])

    def win_cell(num, title, body):
        return [
            Paragraph(f"<font color='#0f766e' size='15'><b>{num}</b></font>", BODY),
            Paragraph(title, H_CARD),
            Paragraph(body, BODY_SMALL),
        ]

    wins = [[
        win_cell("Booking", "Slots, intake, and payment in one flow",
                 "A client picks Tuesday at 9 AM, fills the PAR-Q, signs the waiver, and pays — all from your site, all before you read your email."),
        win_cell("Payments", "Stripe Checkout, package balances bumped",
                 "Sells single sessions or 5/10-packs. The session count auto-decrements when you mark a session complete. Refunds handled by the same hook."),
        win_cell("Your brand", "Same domain, same look, no rebuild",
                 "We can either run on a fresh /p/dee-fitness page or sit behind dee-fitness.com directly. You don&rsquo;t need to touch the site you have."),
    ]]
    wt = Table(wins, colWidths=[2.0 * inch, 2.0 * inch, 2.0 * inch], rowHeights=[1.5 * inch])
    wt.setStyle(win)
    flow.append(wt)

    return flow


# ---- PAGE 3 — RUN THE DAY ---------------------------------------------------
def page_run_day() -> list:
    flow = []
    flow.append(Spacer(1, 0.05 * inch))
    flow.append(Paragraph("RUN THE DAY", EYEBROW))
    flow.append(Paragraph("Calendar, clients, payments — one place.", H_PAGE))
    flow.append(Paragraph(
        "Once a session is on the books, the rest of your day flows from a single "
        "back office. No spreadsheet. No DM thread. No scrambling for whose package "
        "ran out last week.",
        LEAD,
    ))
    flow.append(Spacer(1, 0.1 * inch))

    # Big screenshot — calendar (cropped to remove footer email)
    flow.append(Paragraph("DRAG-DROP WEEK VIEW", EYEBROW))
    flow.append(shot("05-calendar.png", width=6.6, bottom=SIDEBAR_BOTTOM_CROP))
    flow.append(Spacer(1, 0.04 * inch))
    flow.append(Paragraph(
        "Color-coded by status. 6 AM through midnight. Drag a session to reschedule, "
        "click an empty cell to book. Filter chips show how the week breaks down.",
        CAPTION,
    ))

    flow.append(Spacer(1, 0.2 * inch))

    # Two-column: clients list + client detail
    flow.append(Paragraph("EVERY CLIENT ON ONE PAGE", EYEBROW))
    cols = Table(
        [[
            shot("06-clients-list.png", width=3.15, bottom=SIDEBAR_BOTTOM_CROP),
            shot("07-client-detail.png", width=3.15, bottom=SIDEBAR_BOTTOM_CROP),
        ]],
        colWidths=[3.3 * inch, 3.3 * inch],
    )
    cols.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    flow.append(cols)
    flow.append(Spacer(1, 0.04 * inch))
    cap_cols = Table(
        [[
            Paragraph("Status, package balance, and tags at a glance. The yellow banner pre-warns when packs run low.", CAPTION),
            Paragraph("Per-client view: sessions completed, balance, payment history, intake link, portal invite, workouts.", CAPTION),
        ]],
        colWidths=[3.3 * inch, 3.3 * inch],
    )
    cap_cols.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    flow.append(cap_cols)

    return flow


# ---- PAGE 4 — TRAIN THE WORK -----------------------------------------------
def page_train() -> list:
    flow = []
    flow.append(Spacer(1, 0.05 * inch))
    flow.append(Paragraph("TRAIN THE WORK", EYEBROW))
    flow.append(Paragraph("Programs, in-session logging, progress over time.", H_PAGE))
    flow.append(Paragraph(
        "The training side of Trainer Pro is built around how a session actually "
        "runs — from the program you wrote on Sunday to the rep you log on Tuesday "
        "to the chart your client sees on Friday.",
        LEAD,
    ))
    flow.append(Spacer(1, 0.1 * inch))

    # Workouts screenshot
    flow.append(Paragraph("PLAN BUILDER + 50-EXERCISE LIBRARY", EYEBROW))
    flow.append(shot("08-workouts.png", width=6.6, bottom=SIDEBAR_BOTTOM_CROP))
    flow.append(Spacer(1, 0.04 * inch))
    flow.append(Paragraph(
        "Templates and assigned plans live side by side. Drop in exercises from the "
        "library, set sets/reps/rest, save once, reuse forever. Plans show up in the "
        "client&rsquo;s portal too.",
        CAPTION,
    ))

    flow.append(Spacer(1, 0.18 * inch))

    # Progress screenshot
    flow.append(Paragraph("PROGRESS, MEASURED", EYEBROW))
    flow.append(shot("09-progress.png", width=6.6, bottom=SIDEBAR_BOTTOM_CROP))
    flow.append(Spacer(1, 0.04 * inch))
    flow.append(Paragraph(
        "Pick a client to see weight, body fat, lift PRs charted over time. "
        "Photos are stored in Supabase Storage with strict per-trainer access. "
        "Clients see the same numbers in their portal — fewer status-update DMs.",
        CAPTION,
    ))

    return flow


# ---- PAGE 5 — WHAT CHANGES + PRICING + CTA ---------------------------------
def page_close() -> list:
    flow = []
    flow.append(Spacer(1, 0.05 * inch))
    flow.append(Paragraph("WHAT CHANGES", EYEBROW))
    flow.append(Paragraph("dee-fitness.com today vs. with Trainer Pro behind it.", H_PAGE))
    flow.append(Spacer(1, 0.05 * inch))

    # Comparison table
    rows = [
        ["", Paragraph("<b>dee-fitness.com today</b>", BODY),
              Paragraph("<b>+ Trainer Pro</b>", BODY)],
        ["Booking",      "Email or DM",                                    "Slot picker → intake → Stripe in one flow"],
        ["Onboarding",   "Manual back-and-forth",                          "Auto-sent intake link, PAR-Q, e-signature"],
        ["Payments",     "Cash, e-Transfer, Venmo",                        "Stripe Checkout, auto-recorded, package math handled"],
        ["Programs",     "Google Docs, paper",                             "Drag-drop builder, 50+ exercises, in-session logger"],
        ["Progress",     "Memory + photos on phone",                       "Charts per metric, before/after gallery, PRs"],
        ["Client view",  "Ask Dee",                                        "Branded portal — schedule, balance, history, reschedule"],
        ["Adding staff", "Build a new system",                             "Studio mode — each trainer their own clients, one owner view"],
    ]
    body_rows = [[Paragraph(f"<b>{r[0]}</b>", BODY) if r[0] else "",
                  Paragraph(r[1], BODY) if isinstance(r[1], str) else r[1],
                  Paragraph(r[2], BODY) if isinstance(r[2], str) else r[2]]
                 for r in rows]
    cmp_table = Table(body_rows, colWidths=[1.5 * inch, 2.3 * inch, 2.8 * inch])
    cmp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, BRAND),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, BORDER),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
    ]))
    flow.append(cmp_table)

    flow.append(Spacer(1, 0.22 * inch))

    # Pricing strip
    flow.append(Paragraph("WHAT IT COSTS", EYEBROW))
    price_inner = [[
        Paragraph(
            "<font size='30' color='#0f172a'><b>$30</b></font>"
            "<font size='12' color='#475569'>  / month</font>",
            BODY,
        ),
        Paragraph(
            "Everything on this page — booking, payments, plans, progress, public "
            "profile, client portal. No long-term contract. Pause or cancel any "
            "time. Stripe processing fees pass through at the standard 2.9% + 30&cent;. "
            "Studio mode included — same price for up to three trainers.",
            BODY_SUB,
        ),
    ]]
    price_box = Table(price_inner, colWidths=[1.6 * inch, 5.0 * inch])
    price_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.7, BRAND),
        ("LINEABOVE", (0, 0), (-1, 0), 3, BRAND),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    flow.append(price_box)

    flow.append(Spacer(1, 0.22 * inch))

    # Final CTA dark band
    flow.append(Paragraph("NEXT STEP", EYEBROW))
    cta_rows = [
        [Paragraph(
            "<font size='18' color='white'><b>Zalmen — fifteen minutes, live demo, "
            "your domain, your branding.</b></font>",
            BODY,
        )],
        [Paragraph(
            "<font size='10' color='#cbd5e1'>If you don&rsquo;t walk away thinking "
            "&ldquo;this would save me five hours a week,&rdquo; we go separate "
            "ways. Either way you&rsquo;ll have seen what&rsquo;s possible. Reply "
            "to the email I sent or text me directly — I&rsquo;ll send a demo URL "
            "the same day.</font>",
            BODY,
        )],
    ]
    cta = Table(cta_rows, colWidths=[6.6 * inch])
    cta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK),
        ("BOX", (0, 0), (-1, -1), 0.5, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), 22),
        ("RIGHTPADDING", (0, 0), (-1, -1), 22),
        ("TOPPADDING", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    flow.append(cta)

    return flow


# ---- main -------------------------------------------------------------------
def build(out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cover_frame = Frame(
        0.6 * inch, 0.7 * inch,
        LETTER[0] - 1.2 * inch, LETTER[1] - 1.4 * inch,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        showBoundary=0,
    )
    inner_frame = Frame(
        0.6 * inch, 0.7 * inch,
        LETTER[0] - 1.2 * inch, LETTER[1] - 1.4 * inch,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        showBoundary=0,
    )

    doc = BaseDocTemplate(
        str(out_path),
        pagesize=LETTER,
        title="Trainer Pro for Dee Fitness",
        author="Trainer Pro",
        subject="A pitch for Zalmen",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover_chrome),
        PageTemplate(id="inner", frames=[inner_frame], onPage=inner_chrome),
    ])

    flow = []
    flow.extend(page_cover())

    flow.append(NextPageTemplate("inner"))
    flow.append(PageBreak())
    flow.extend(page_story())

    flow.append(PageBreak())
    flow.extend(page_run_day())

    flow.append(PageBreak())
    flow.extend(page_train())

    flow.append(PageBreak())
    flow.extend(page_close())

    doc.build(flow)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    build(OUT)
