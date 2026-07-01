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