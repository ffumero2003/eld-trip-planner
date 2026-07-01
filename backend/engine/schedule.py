# engine/schedule.py
# Increment 4: turn the engine's minute-based segments into real clock times
# and split them across calendar days, ready for the log sheets.

from datetime import datetime, timedelta
from dataclasses import dataclass, field
from engine.models import DutyStatus


@dataclass
class DaySegment:
    # A piece of duty time within ONE calendar day.
    # Times are minutes-from-that-day's-midnight (0..1440) — the exact
    # coordinate system the log grid draws in.
    status: DutyStatus
    start_minute: int
    end_minute: int


@dataclass
class LogDay:
    date: str                       # the calendar date this sheet represents
    segments: list = field(default_factory=list)  # DaySegments within this day

def pad_day(day):
    # Fill any uncovered time in a LogDay with Off-Duty so it totals 24h (1440 min).
    # Assumes day.segments are already in chronological order within the day.
    filled = []
    cursor = 0  # minutes-from-midnight we've accounted for so far

    for seg in day.segments:
        # Gap between where we are and where this segment starts -> Off-Duty.
        if seg.start_minute > cursor:
            filled.append(DaySegment(DutyStatus.OFF_DUTY, cursor, seg.start_minute))
        filled.append(seg)
        cursor = seg.end_minute

    # Gap after the last segment to end-of-day -> Off-Duty.
    if cursor < 1440:
        filled.append(DaySegment(DutyStatus.OFF_DUTY, cursor, 1440))

    day.segments = filled
    return day


def build_days(segments, start_datetime):
    # segments: the engine's output (DutySegment, elapsed minutes from trip start)
    # start_datetime: real datetime that elapsed-minute 0 maps to
    days = {}  # keyed by date string, so pieces of the same day collect together

    def day_for(dt):
        # Fetch or create the LogDay for a given datetime's date.
        key = dt.strftime("%Y-%m-%d")
        if key not in days:
            days[key] = LogDay(date=key)
        return days[key]

    for seg in segments:
        # Absolute start/end datetimes for this segment.
        seg_start = start_datetime + timedelta(minutes=seg.start_minute)
        seg_end = start_datetime + timedelta(minutes=seg.end_minute)

        cursor = seg_start
        # Keep slicing until the whole segment is placed.
        while cursor < seg_end:
            # Midnight that ends the day `cursor` is in.
            next_midnight = (cursor + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            # This piece ends either at the segment's real end or at midnight,
            # whichever comes first.
            piece_end = min(seg_end, next_midnight)

            # This day's midnight, to express the piece in minutes-from-midnight.
            day_midnight = cursor.replace(hour=0, minute=0, second=0, microsecond=0)
            start_min = int((cursor - day_midnight).total_seconds() // 60)
            end_min = int((piece_end - day_midnight).total_seconds() // 60)

            day_for(cursor).segments.append(
                DaySegment(seg.status, start_min, end_min)
            )

            cursor = piece_end  # carry the remainder forward into the next day

    # Return days in chronological order.
    return [pad_day(days[k]) for k in sorted(days.keys())]

