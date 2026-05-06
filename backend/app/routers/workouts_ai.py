"""AI-generated workout plans powered by Anthropic Claude.

Why this is a Python endpoint and not a frontend call:
1. We keep the API key on the server (clients never see it).
2. We can validate, log, and rate-limit centrally.
3. We can post-process the model output (e.g., enforce schema, save to Supabase).

If ANTHROPIC_API_KEY is unset, the endpoint returns a clear "not configured"
error rather than crashing — so the rest of the app still works.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..auth import CurrentUser
from ..config import settings

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateWorkoutRequest(BaseModel):
    client_name: str = Field(..., description="Used to personalize the plan")
    goals: str = Field(..., description="What the client wants to achieve")
    experience: Literal["beginner", "intermediate", "advanced"] = "beginner"
    equipment: list[str] = Field(default_factory=list, description="What's available")
    duration_minutes: int = Field(60, ge=15, le=180)
    constraints: str | None = Field(None, description="Injuries, limitations, preferences")


class Exercise(BaseModel):
    name: str
    sets: int
    reps: int | str
    weight: float | None = None
    rest_sec: int | None = None
    notes: str | None = None


class GenerateWorkoutResponse(BaseModel):
    plan_name: str
    description: str
    exercises: list[Exercise]


@router.post("/workout", response_model=GenerateWorkoutResponse)
def generate_workout(req: GenerateWorkoutRequest, _user: CurrentUser):
    """Generate a workout plan using Claude. Falls back to a sensible template if AI is not configured."""
    if not settings.ANTHROPIC_API_KEY:
        # Heuristic fallback so the endpoint is useful even without an API key.
        return _fallback_plan(req)

    try:
        from anthropic import Anthropic
    except ImportError as e:
        raise HTTPException(500, "anthropic SDK not installed on server") from e

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = (
        "You are a certified personal trainer designing safe, effective workouts. "
        "Always return valid JSON matching the requested schema, no commentary."
    )
    user_prompt = (
        f"Design a {req.duration_minutes}-minute workout for {req.client_name}.\n"
        f"Experience: {req.experience}\n"
        f"Goals: {req.goals}\n"
        f"Equipment: {', '.join(req.equipment) or 'bodyweight only'}\n"
        f"Constraints: {req.constraints or 'none'}\n\n"
        "Return JSON with this shape:\n"
        '{\n'
        '  "plan_name": "string",\n'
        '  "description": "1-2 sentence rationale",\n'
        '  "exercises": [\n'
        '    {"name": "...", "sets": 3, "reps": 10, "weight": null, "rest_sec": 60, "notes": "form cue"}\n'
        '  ]\n'
        "}"
    )

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text"))
    except Exception as e:
        raise HTTPException(502, f"AI provider error: {e}") from e

    # Pull the first JSON object out of the response defensively
    import json
    import re

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise HTTPException(502, "AI returned non-JSON response")
    try:
        data = json.loads(match.group(0))
        return GenerateWorkoutResponse(**data)
    except Exception as e:
        raise HTTPException(502, f"AI response did not match schema: {e}") from e


def _fallback_plan(req: GenerateWorkoutRequest) -> GenerateWorkoutResponse:
    """Static fallback so the endpoint is useful in dev without an API key."""
    if req.experience == "beginner":
        exercises = [
            Exercise(name="Bodyweight Squat", sets=3, reps=10, rest_sec=60, notes="Knees track over toes"),
            Exercise(name="Push-up (knee or full)", sets=3, reps=8, rest_sec=60, notes="Tight core"),
            Exercise(name="Glute Bridge", sets=3, reps=12, rest_sec=45),
            Exercise(name="Plank", sets=3, reps="30 sec", rest_sec=45),
            Exercise(name="Walking Lunges", sets=2, reps=10, rest_sec=60, notes="Per leg"),
        ]
    elif req.experience == "intermediate":
        exercises = [
            Exercise(name="Goblet Squat", sets=4, reps=10, rest_sec=75),
            Exercise(name="Dumbbell Bench Press", sets=4, reps=10, rest_sec=90),
            Exercise(name="Bent-over Row", sets=4, reps=10, rest_sec=75),
            Exercise(name="Romanian Deadlift", sets=3, reps=10, rest_sec=90),
            Exercise(name="Hanging Knee Raises", sets=3, reps=12, rest_sec=60),
        ]
    else:
        exercises = [
            Exercise(name="Back Squat", sets=5, reps=5, rest_sec=120),
            Exercise(name="Bench Press", sets=5, reps=5, rest_sec=120),
            Exercise(name="Pendlay Row", sets=4, reps=6, rest_sec=90),
            Exercise(name="Romanian Deadlift", sets=4, reps=8, rest_sec=90),
            Exercise(name="Weighted Pull-ups", sets=3, reps=6, rest_sec=120),
        ]

    return GenerateWorkoutResponse(
        plan_name=f"{req.experience.title()} Full-Body Session",
        description=(
            f"A {req.duration_minutes}-min full-body session targeting "
            f"{req.goals.lower() or 'general fitness'}. "
            "(Fallback plan — set ANTHROPIC_API_KEY for AI-generated plans.)"
        ),
        exercises=exercises,
    )
