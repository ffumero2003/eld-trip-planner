# engine/models.py
# Plain Python data model for the ELD trip planner engine.
# No Django here on purpose: this is pure logic we can test in isolation.

from enum import Enum
from dataclasses import dataclass


# The four duty statuses a driver can be in at any moment.
# These are the four rows on the FMCSA log grid.
# Enum = a fixed set of named choices, so we never pass around loose strings
# like "driving" vs "Driving" and get bitten by typos.
class DutyStatus(Enum):
    OFF_DUTY = "off_duty"
    SLEEPER_BERTH = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY_NOT_DRIVING = "on_duty_not_driving"


# What the user gives us to plan a trip.
# @dataclass auto-generates the boilerplate (__init__, etc.) so we just
# declare the fields. Each field has a name and a type.
@dataclass
class TripInput:
    current_location: str        # where the driver is right now
    pickup_location: str         # where they pick up the load
    dropoff_location: str        # where they deliver it
    current_cycle_hours: float   # hours already used in the 70hr/8day cycle


# One block of time in a single duty status.
# The engine's whole output is an ordered list of these.
# Both the map and the log sheets are just different renderings of this list.
@dataclass
class DutySegment:
    status: DutyStatus           # which of the four statuses this block is
    start_minute: int            # minutes from trip start (0 = trip start)
    end_minute: int              # minutes from trip start


@dataclass
class TripLeg:
    distance_miles: float          # how far this leg drives
    drive_minutes: int             # how long it takes (from the route API later)
    event_after: DutyStatus = None # on-duty event after the leg (pickup/dropoff), or None
    event_minutes: int = 0         # length of that event (60 for pickup/dropoff)