# test_engine.py
# End-to-end smoke test of the engine. Not a real test suite yet —
# just a runnable script to eyeball the output against HOS rules.

from datetime import datetime
from engine.models import DutyStatus, TripLeg
from engine.simulate import simulate
from engine.schedule import build_days

# A trip with two legs: short drive to pickup, then a long haul to dropoff.
# Leg 1: 150 miles / 3 hours, then 60-min pickup.
# Leg 2: 1200 miles / 20 hours, then 60-min dropoff.
legs = [
    TripLeg(150, 180, DutyStatus.ON_DUTY_NOT_DRIVING, 60),
    TripLeg(1200, 1200, DutyStatus.ON_DUTY_NOT_DRIVING, 60),
]

# Driver starts with 10 cycle hours already used.
segments = simulate(legs, current_cycle_hours=10)

# Anchor the trip to a real start time (6:00 AM).
start = datetime(2026, 7, 1, 6, 0)
days = build_days(segments, start)

# Print each day's grid data and confirm each day totals 24 hours.
for day in days:
    print(f"\n=== {day.date} ===")
    totals = {}
    for s in day.segments:
        mins = s.end_minute - s.start_minute
        totals[s.status] = totals.get(s.status, 0) + mins
        # h:mm start/end for readability
        sh, sm = divmod(s.start_minute, 60)
        eh, em = divmod(s.end_minute, 60)
        print(f"  {s.status.value:22} {sh:02}:{sm:02} -> {eh:02}:{em:02}")
    total = sum(totals.values())
    print(f"  --- day total: {total} min ({total/60:.1f} h) ---")
    for status, mins in totals.items():
        print(f"      {status.value}: {mins/60:.2f} h")