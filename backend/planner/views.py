from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from engine.models import DutyStatus, TripLeg
from engine.simulate import simulate
from engine.schedule import build_days

from planner.routing import geocode, get_leg, RoutingError

import json
import anthropic
from dotenv import load_dotenv

load_dotenv()  # pull ANTHROPIC_API_KEY from backend/.env


def day_to_dict(day):
    return {
        "date": day.date,
        "segments": [
            {
                "status": seg.status.value,
                "start_minute": seg.start_minute,
                "end_minute": seg.end_minute,
            }
            for seg in day.segments
        ],
    }


@api_view(["POST"])
def plan_trip(request):
    current = request.data.get("current_location")
    pickup = request.data.get("pickup_location")
    dropoff = request.data.get("dropoff_location")
    current_cycle_hours = float(request.data.get("current_cycle_hours", 0))

    if not (current and pickup and dropoff):
        return Response(
            {"status": "error", "message": "current, pickup, and dropoff locations are required"},
            status=400,
        )

    try:
        current_c = geocode(current)
        pickup_c = geocode(pickup)
        dropoff_c = geocode(dropoff)

        leg1_miles, leg1_min, leg1_geom = get_leg(current_c, pickup_c)
        leg2_miles, leg2_min, leg2_geom = get_leg(pickup_c, dropoff_c)
    except RoutingError as e:
        return Response({"status": "error", "message": str(e)}, status=400)

    legs = [
        TripLeg(leg1_miles, round(leg1_min), DutyStatus.ON_DUTY_NOT_DRIVING, 60),
        TripLeg(leg2_miles, round(leg2_min), DutyStatus.ON_DUTY_NOT_DRIVING, 60),
    ]

    segments = simulate(legs, current_cycle_hours)
    days = build_days(segments, datetime(2026, 7, 1, 6, 0))

    # Stops the map should mark. ORS coords are [lon, lat]; Leaflet wants
    # [lat, lon], so we flip them here at the boundary.
    stops = [
        {"label": "Current", "lat": current_c[1], "lon": current_c[0]},
        {"label": "Pickup", "lat": pickup_c[1], "lon": pickup_c[0]},
        {"label": "Dropoff", "lat": dropoff_c[1], "lon": dropoff_c[0]},
    ]

    return Response({
        "status": "ok",
        "days": [day_to_dict(day) for day in days],
        "route_geometry": [leg1_geom, leg2_geom],  # two encoded polylines
        "stops": stops,
    })

@api_view(["POST"])
def explain_trip(request):
    """Ask Claude to explain the planned trip + ELD logs in plain English.

    The frontend sends back the same `days` and `stops` it got from /plan/,
    so we don't have to re-run routing/geocoding here.
    """
    days = request.data.get("days")
    stops = request.data.get("stops")
    if not days:
        return Response(
            {"status": "error", "message": "days is required"}, status=400
        )

    prompt = (
        "Here is a truck driver's planned trip.\n\n"
        f"Stops (in order): {json.dumps(stops)}\n\n"
        "Daily ELD duty-status logs. Each day has segments with a status "
        "(off_duty, sleeper_berth, driving, on_duty_not_driving) and start/end "
        "minutes counted from midnight (0-1440):\n"
        f"{json.dumps(days)}\n\n"
        "Explain this plan to the driver in plain English: the overall route, "
        "what each day looks like (when they drive, rest, and take breaks), "
        "and how the plan respects the FMCSA hours-of-service rules "
        "(11-hour driving limit, 14-hour on-duty window, 30-minute break, "
        "10-hour rest). Keep it under 250 words, friendly, no markdown headers."
    )

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

    try:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=2000,
            thinking={"type": "adaptive"},
            system="You are a helpful assistant for truck drivers using an ELD trip planner.",
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.RateLimitError:
        return Response(
            {"status": "error", "message": "AI is busy, try again in a moment"},
            status=429,
        )
    except anthropic.APIStatusError as e:
        return Response(
            {"status": "error", "message": f"AI request failed ({e.status_code})"},
            status=502,
        )

    # The response is a list of blocks (thinking + text); take the text.
    explanation = next(
        (block.text for block in response.content if block.type == "text"), ""
    )
    return Response({"status": "ok", "explanation": explanation})