"""Standalone smoke test for the PDF report generation logic.

Bypasses FastAPI auth/HTTP and renders a PDF directly to a file so we can
prove ReportLab works on this Windows machine before the user even sets
up Supabase.

Run from `backend/` after activating the venv:
    .\venv\Scripts\python.exe test_pdf.py
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def render_demo_pdf(out_path: str) -> int:
    """Render a sample monthly report. Returns byte size of the produced PDF."""
    # Fake data — no Supabase needed
    client = {"full_name": "Sarah Demo"}
    sessions = [
        {"starts_at": "2026-05-01T09:00:00+00:00", "status": "completed", "location": "Studio", "price": 80.00},
        {"starts_at": "2026-05-03T09:00:00+00:00", "status": "completed", "location": "Studio", "price": 80.00},
        {"starts_at": "2026-05-05T17:00:00+00:00", "status": "completed", "location": "Park", "price": 80.00},
        {"starts_at": "2026-05-08T09:00:00+00:00", "status": "no_show", "location": "Studio", "price": 80.00},
        {"starts_at": "2026-05-10T09:00:00+00:00", "status": "completed", "location": "Zoom", "price": 60.00},
    ]
    payments = [
        {"paid_at": "2026-05-01T12:00:00+00:00", "method": "venmo", "payment_type": "package", "amount": 800.00},
        {"paid_at": "2026-05-15T12:00:00+00:00", "method": "venmo", "payment_type": "session", "amount": 80.00},
    ]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>{client['full_name']}</b> — Monthly Report", styles["Title"]))
    story.append(Paragraph("May 2026", styles["Heading3"]))
    story.append(Spacer(1, 0.2 * inch))

    # Sessions table
    story.append(Paragraph("<b>Sessions</b>", styles["Heading2"]))
    rows = [["Date", "Status", "Location", "Price"]]
    for s in sessions:
        starts = datetime.fromisoformat(s["starts_at"].replace("Z", "+00:00"))
        rows.append([starts.strftime("%a %b %d %H:%M"), s["status"], s.get("location") or "—", f"${s['price']:.2f}"])
    t = Table(rows, colWidths=[1.8 * inch, 1.2 * inch, 1.8 * inch, 1.2 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d6a9f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f8fa")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.25 * inch))

    # Payments
    story.append(Paragraph("<b>Payments</b>", styles["Heading2"]))
    total = sum(float(p["amount"]) for p in payments)
    rows = [["Date", "Method", "Type", "Amount"]]
    for p in payments:
        paid = datetime.fromisoformat(p["paid_at"].replace("Z", "+00:00"))
        rows.append([paid.strftime("%b %d"), p["method"], p["payment_type"], f"${float(p['amount']):.2f}"])
    rows.append(["", "", "Total", f"${total:.2f}"])
    t = Table(rows, colWidths=[1.5 * inch, 1.5 * inch, 1.7 * inch, 1.3 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d6a9f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (-2, -1), (-1, -1), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f6f8fa")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.5 * inch))
    story.append(
        Paragraph(
            f"<font color='#94a3b8' size='9'>Generated {datetime.now().strftime('%B %d, %Y')} · Trainer Pro</font>",
            styles["Normal"],
        )
    )

    doc.build(story)
    pdf_bytes = buf.getvalue()
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    return len(pdf_bytes)


if __name__ == "__main__":
    size = render_demo_pdf("demo_report.pdf")
    print(f"OK — wrote demo_report.pdf ({size:,} bytes)")
