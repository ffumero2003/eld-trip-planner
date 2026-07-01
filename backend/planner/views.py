from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from engine.models import DutyStatus, TripLeg
from engine.simulate import simulate
from engine.schedule import build_days

from planner.routing import geocode, get_leg, RoutingError


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
    print(">>> plan_trip START", flush=True)
    current = request.data.get("current_location")
    pickup = request.data.get("pickup_location")
    dropoff = request.data.get("dropoff_location")
    current_cycle_hours = float(request.data.get("current_cycle_hours", 0))
    print(">>> inputs parsed:", current, pickup, dropoff, flush=True)

    if not (current and pickup and dropoff):
        return Response(
            {"status": "error", "message": "current, pickup, and dropoff locations are required"},
            status=400,
        )

    try:
        current_c = geocode(current)
        print(">>> geocoded current", flush=True)
        pickup_c = geocode(pickup)
        print(">>> geocoded pickup", flush=True)
        dropoff_c = geocode(dropoff)
        print(">>> geocoded dropoff", flush=True)

        leg1_miles, leg1_min = get_leg(current_c, pickup_c)
        print(">>> leg1 done", flush=True)
        leg2_miles, leg2_min = get_leg(pickup_c, dropoff_c)
        print(">>> leg2 done", flush=True)
    except RoutingError as e:
        print(">>> RoutingError:", e, flush=True)
        return Response({"status": "error", "message": str(e)}, status=400)

    legs = [
        TripLeg(leg1_miles, round(leg1_min), DutyStatus.ON_DUTY_NOT_DRIVING, 60),
        TripLeg(leg2_miles, round(leg2_min), DutyStatus.ON_DUTY_NOT_DRIVING, 60),
    ]

    segments = simulate(legs, current_cycle_hours)
    days = build_days(segments, datetime(2026, 7, 1, 6, 0))
    print(">>> engine done", flush=True)

    return Response({
        "status": "ok",
        "days": [day_to_dict(day) for day in days],
    })