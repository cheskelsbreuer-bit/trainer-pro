"""PDF report generation — client progress reports, monthly summaries, etc.

These are the kind of features Python is genuinely better than JS for: server-side
PDF generation with consistent fonts, layout, and tabular data is a one-liner with
ReportLab vs. fighting browser print CSS.
"""

import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..auth import CurrentUser
from ..db import supabase_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/client/{client_id}/monthly.pdf")
def client_monthly_report(
    client_id: str,
    user: CurrentUser,
    authorization: str = Header(...),
):
    """Generate a one-page monthly progress + payment summary for a client."""
    jwt = authorization.split(" ", 1)[1]
    sb = supabase_user(jwt)

    # Pull data scoped to this user via RLS
    client_resp = sb.table("clients").select("*").eq("id", client_id).single().execute()
    if not client_resp.data:
        raise HTTPException(404, "Client not found")
    client = client_resp.data

    month_start = (datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0))
    next_month = (month_start + timedelta(days=32)).replace(day=1)

    sessions_resp = (
        sb.table("sessions")
        .select("*")
        .eq("client_id", client_id)
        .gte("starts_at", month_start.isoformat())
        .lt("starts_at", next_month.isoformat())
        .order("starts_at")
        .execute()
    )
    payments_resp = (
        sb.table("payments")
        .select("*")
        .eq("client_id", client_id)
        .gte("paid_at", month_start.isoformat())
        .lt("paid_at", next_month.isoformat())
        .order("paid_at")
        .execute()
    )

    # Build PDF
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>{client['full_name']}</b> — Monthly Report", styles["Title"]))
    story.append(Paragraph(month_start.strftime("%B %Y"), styles["Heading3"]))
    story.append(Spacer(1, 0.2 * inch))

    # Sessions table
    if sessions_resp.data:
        story.append(Paragraph("<b>Sessions</b>", styles["Heading2"]))
        rows = [["Date", "Status", "Location", "Price"]]
        for s in sessions_resp.data:
            starts = datetime.fromisoformat(s["starts_at"].replace("Z", "+00:00"))
            rows.append(
                [
                    starts.strftime("%a %b %d %H:%M"),
                    s["status"],
                    s.get("location") or "—",
                    f"${s['price']:.2f}" if s.get("price") else "—",
                ]
            )
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
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 0.25 * inch))
    else:
        story.append(Paragraph("<i>No sessions recorded this month.</i>", styles["BodyText"]))
        story.append(Spacer(1, 0.2 * inch))

    # Payments
    if payments_resp.data:
        story.append(Paragraph("<b>Payments</b>", styles["Heading2"]))
        total = sum(float(p["amount"]) for p in payments_resp.data)
        rows = [["Date", "Method", "Type", "Amount"]]
        for p in payments_resp.data:
            paid = datetime.fromisoformat(p["paid_at"].replace("Z", "+00:00"))
            rows.append(
                [
                    paid.strftime("%b %d"),
                    p.get("method") or "—",
                    p["payment_type"],
                    f"${float(p['amount']):.2f}",
                ]
            )
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
    else:
        story.append(Paragraph("<i>No payments recorded this month.</i>", styles["BodyText"]))

    story.append(Spacer(1, 0.5 * inch))
    story.append(
        Paragraph(
            f"<font color='#94a3b8' size='9'>Generated {datetime.now().strftime('%B %d, %Y')} · Trainer Pro</font>",
            styles["Normal"],
        )
    )

    doc.build(story)
    buf.seek(0)

    filename = f"{client['full_name'].replace(' ', '_')}_{month_start.strftime('%Y-%m')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
