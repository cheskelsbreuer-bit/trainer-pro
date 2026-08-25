"""Automatic weekly billing for the Babysitting vertical.

On each sitter's chosen day, every ACTIVE kid with a weekly rate gets
their week's charge posted automatically — sibling discounts applied,
away kids skipped (they're status=paused, so they never appear).
Charges land exactly where manual ones do: the kid's running total
(tags) plus the charge history in the config blob, so statements,
balances, and Thursday reminders all see them.

Safety: per-day dedupe via activity_log, hard cap per run, per-kid
error isolation, dry-run mode, and the same CRON_SECRET gate as the
reminder engine.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .reminders import (
    _KID_MARKER,
    _require_cron_secret,
    _tag_value,
    _tag_num,
)

router = APIRouter(prefix="/billing", tags=["auto-billing"])

_MAX_KIDS_PER_RUN = 200


def _tags_after_charge(tags: list, amount: float) -> list:
    """Server port of the frontend's tagsAfterCharge: owed += amount,
    balance recomputed from owed - paid."""
    kept: dict[str, str] = {}
    order: list[str] = []
    for t in tags or []:
        if not isinstance(t, str):
            continue
        idx = t.find(":")
        key = t[: idx + 1] if idx > 0 else t
        if key not in kept:
            order.append(key)
        kept[key] = t[idx + 1 :] if idx > 0 else ""
    owed = round((_tag_num(tags, "totalowed:") + amount) * 100) / 100
    paid = _tag_num(tags, "totalpaid:")
    kept["totalowed:"] = str(owed)
    kept["totalpaid:"] = str(paid)
    kept["balance:"] = str(round((owed - paid) * 100) / 100)
    for key in ("totalowed:", "totalpaid:", "balance:"):
        if key not in order:
            order.append(key)
    return [k if v == "" else f"{k}{v}" for k, v in ((key, kept[key]) for key in order)]


class RunWeeklyRequest(BaseModel):
    dry_run: bool = True
    force: bool = False


def _run_billing_for_trainer(sb, trainer: dict, req: RunWeeklyRequest, triggered_by: str) -> dict:
    profile = trainer.get("public_profile") or {}
    bs = profile.get("babysitting") or {}
    bs_settings = bs.get("settings") or {}
    fd = bs_settings.get("familyDiscount") or {}

    # Once-per-day dedupe.
    if not req.dry_run and not req.force:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        prior = (
            sb.table("activity_log")
            .select("id")
            .eq("trainer_id", trainer["id"])
            .eq("action", "weekly_auto_billing")
            .gte("created_at", today_start.isoformat())
            .limit(1)
            .execute()
        )
        if prior.data:
            return {"trainer_id": trainer["id"], "skipped": "already billed today"}

    kids_resp = (
        sb.table("clients")
        .select("id, full_name, status, tags")
        .eq("trainer_id", trainer["id"])
        .eq("status", "active")
        .contains("tags", [_KID_MARKER])
        .execute()
    )
    kids = (kids_resp.data or [])[:_MAX_KIDS_PER_RUN]

    # Group by family for the sibling discount; stable order by name.
    by_family: dict[str, list[dict]] = {}
    for k in sorted(kids, key=lambda x: x.get("full_name") or ""):
        fam = _tag_value(k.get("tags"), "family:") or f"solo-{k['id']}"
        by_family.setdefault(fam, []).append(k)

    plan = []
    for fam, members in by_family.items():
        for i, k in enumerate(members):
            rate = _tag_num(k.get("tags"), "wrate:")
            if rate <= 0:
                continue
            amount = rate
            if fd.get("enabled") and i > 0 and len(members) > 1:
                if fd.get("type") == "flat":
                    amount = max(0.0, rate - float(fd.get("value") or 0))
                else:
                    amount = rate * (1 - float(fd.get("value") or 0) / 100)
            amount = round(amount * 100) / 100
            if amount <= 0:
                continue
            plan.append({"kid": k, "family": fam, "amount": amount, "discounted": amount != rate})

    total = round(sum(p["amount"] for p in plan) * 100) / 100

    if req.dry_run:
        return {
            "trainer_id": trainer["id"],
            "dry_run": True,
            "would_bill": [
                {"kid": p["kid"]["full_name"], "amount": p["amount"], "discounted": p["discounted"]}
                for p in plan
            ],
            "total": total,
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    billed = 0
    errors: list[str] = []
    new_charges = []
    for p in plan:
        try:
            sb.table("clients").update(
                {"tags": _tags_after_charge(p["kid"].get("tags") or [], p["amount"])}
            ).eq("id", p["kid"]["id"]).execute()
            new_charges.append(
                {
                    "id": f"ch-auto-{p['kid']['id'][:8]}-{now_iso[:10]}",
                    "ts": now_iso,
                    "clientId": p["kid"]["id"],
                    "kidName": p["kid"]["full_name"],
                    "familySlug": "" if p["family"].startswith("solo-") else p["family"],
                    "amount": p["amount"],
                    "kind": "week",
                    "note": "auto",
                }
            )
            billed += 1
        except Exception as e:  # noqa: BLE001 — isolate per kid
            errors.append(f"{p['kid']['full_name']}: {e}")

    # Append the charges + a log line to the config blob (re-read first
    # so we never clobber sibling profile keys).
    try:
        cur = sb.table("trainers").select("public_profile").eq("id", trainer["id"]).single().execute()
        prof = (cur.data or {}).get("public_profile") or {}
        bs_cur = prof.get("babysitting") or {}
        bs_cur["charges"] = (new_charges + (bs_cur.get("charges") or []))[:1000]
        log = bs_cur.get("log") or []
        log.insert(
            0,
            {
                "id": f"lg-auto-{now_iso}",
                "ts": now_iso,
                "category": "charge",
                "action": f"Auto-billed the week: ${total:g} across {billed} kids",
                "details": "automatic weekly billing",
            },
        )
        bs_cur["log"] = log[:300]
        prof["babysitting"] = bs_cur
        sb.table("trainers").update({"public_profile": prof}).eq("id", trainer["id"]).execute()
    except Exception as e:  # noqa: BLE001
        errors.append(f"history write: {e}")

    result = {
        "trainer_id": trainer["id"],
        "dry_run": False,
        "billed_kids": billed,
        "total": total,
        "errors": errors[:10],
    }
    try:
        sb.table("activity_log").insert(
            {
                "trainer_id": trainer["id"],
                "actor": "system",
                "action": "weekly_auto_billing",
                "entity_type": "billing_run",
                "details": {**result, "triggered_by": triggered_by},
            }
        ).execute()
    except Exception:  # noqa: BLE001
        pass
    return result


@router.post("/run-weekly")
def run_weekly(
    req: RunWeeklyRequest,
    x_cron_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> dict:
    from ..db import supabase_admin

    sb = supabase_admin()

    if x_cron_secret is not None:
        _require_cron_secret(x_cron_secret)
        trainers = (
            sb.table("trainers")
            .select("id, full_name, business_name, public_profile, template_slugs")
            .contains("template_slugs", ["babysitting"])
            .execute()
        )
        js_today = (datetime.now(timezone.utc).weekday() + 1) % 7  # Sun=0 … Sat=6
        results = []
        for t in trainers.data or []:
            ab = ((t.get("public_profile") or {}).get("babysitting") or {}).get("settings", {}).get("autoBilling") or {}
            if not ab.get("enabled"):
                continue
            if int(ab.get("day", 0)) != js_today:
                continue
            try:
                results.append(_run_billing_for_trainer(sb, t, req, triggered_by="cron"))
            except Exception as e:  # noqa: BLE001
                results.append({"trainer_id": t["id"], "error": str(e)[:200]})
        return {"ran_for": len(results), "results": results}

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user

    user = get_current_user(authorization)
    trainer_resp = (
        sb.table("trainers")
        .select("id, full_name, business_name, public_profile, template_slugs")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not trainer_resp.data:
        raise HTTPException(404, "Trainer not found")
    return _run_billing_for_trainer(sb, trainer_resp.data, req, triggered_by="trainer")
