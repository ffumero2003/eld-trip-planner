# engine/simulate.py

from engine.models import DutyStatus, DutySegment

DRIVING_LIMIT = 11 * 60
WINDOW_LIMIT = 14 * 60
BREAK_AFTER = 8 * 60
BREAK_LENGTH = 30
REST_LENGTH = 10 * 60
CYCLE_LIMIT = 70 * 60          # 70-hour/8-day clock, in minutes
RESTART_LENGTH = 34 * 60      # 34-hour restart resets the cycle clock
FUEL_EVERY_MILES = 1000       # fuel stop every 1,000 miles
FUEL_LENGTH = 30              # 30-min fuel stop, on-duty


def simulate(legs, current_cycle_hours):
    segments = []
    clock = 0

    # Shift clocks — reset by a 10-hour rest.
    driving_used = 0
    window_used = 0
    since_break = 0

    # Cycle clock — only reset by a 34-hour restart. Starts non-zero from input.
    cycle_used = int(current_cycle_hours * 60)

    # Distance accumulator — drives the fuel-stop milestones across the whole trip.
    miles_done = 0.0
    next_fuel_at = FUEL_EVERY_MILES   # next mileage mark that triggers a fuel stop

    # --- small helpers so the main loop stays readable ---

    def add(status, length):
        # Append a segment of `length` minutes and advance the timeline cursor.
        nonlocal clock
        segments.append(DutySegment(status, clock, clock + length))
        clock += length

    def take_rest():
        # 10-hour rest: resets the three SHIFT clocks, not the cycle clock.
        nonlocal driving_used, window_used, since_break
        add(DutyStatus.SLEEPER_BERTH, REST_LENGTH)
        driving_used = 0
        window_used = 0
        since_break = 0

    def take_restart():
        # 34-hour restart: the only thing that resets the cycle clock.
        nonlocal driving_used, window_used, since_break, cycle_used
        add(DutyStatus.OFF_DUTY, RESTART_LENGTH)
        driving_used = 0
        window_used = 0
        since_break = 0
        cycle_used = 0

    def on_duty_event(status, length):
        # A non-driving on-duty block (pickup, dropoff, fuel).
        # Burns the 14hr window and the 70hr cycle, NOT the 11hr driving clock.
        nonlocal window_used, cycle_used
        # If the cycle can't fit this event, restart first.
        if cycle_used + length > CYCLE_LIMIT:
            take_restart()
        # If the window can't fit it, the shift is over — take a rest first.
        if window_used + length > WINDOW_LIMIT:
            take_rest()
        add(status, length)
        window_used += length
        cycle_used += length

    # --- main loop: process each leg in order ---

    for leg in legs:
        drive_left = leg.drive_minutes
        # miles-per-minute for THIS leg, so we can convert a driving chunk to miles
        mpm = (leg.distance_miles / leg.drive_minutes) if leg.drive_minutes else 0

        while drive_left > 0:
            # If cycle is exhausted, must restart before any more driving.
            if cycle_used >= CYCLE_LIMIT:
                take_restart()

            # Minutes until the next fuel stop, converted from remaining miles.
            miles_to_fuel = next_fuel_at - miles_done
            mins_to_fuel = (miles_to_fuel / mpm) if mpm else float("inf")

            # Smallest remaining allowance wins — same idea as increment 2,
            # now with fuel distance and the cycle clock added in.
            can_drive = min(
                drive_left,
                DRIVING_LIMIT - driving_used,
                WINDOW_LIMIT - window_used,
                BREAK_AFTER - since_break,
                CYCLE_LIMIT - cycle_used,
                mins_to_fuel,
            )
            can_drive = int(can_drive)

            if can_drive > 0:
                add(DutyStatus.DRIVING, can_drive)
                drive_left -= can_drive
                driving_used += can_drive
                window_used += can_drive
                since_break += can_drive
                cycle_used += can_drive
                miles_done += can_drive * mpm

            # Reached (or effectively reached) a fuel milestone?
            # Tolerance of 1 mile so a floored-to-zero drive chunk that lands
            # just short (e.g. 999.6) still triggers the stop and advances the mark.
            # `continue` restarts the loop with the mark pushed to the next 1,000,
            # which makes mins_to_fuel large again and lets driving resume.
            if miles_done >= next_fuel_at - 1.0 and (drive_left > 0 or leg.event_after):
                on_duty_event(DutyStatus.ON_DUTY_NOT_DRIVING, FUEL_LENGTH)
                next_fuel_at += FUEL_EVERY_MILES
                continue

            # Safety backstop: if driving can't advance AND no fuel stop is due,
            # something is stuck — stop rather than spin the server forever.
            if can_drive <= 0 and miles_done < next_fuel_at - 1.0:
                break

            if drive_left <= 0:
                break

            # Which shift/break clock forced the stop?
            if driving_used >= DRIVING_LIMIT or window_used >= WINDOW_LIMIT:
                take_rest()
            elif since_break >= BREAK_AFTER:
                add(DutyStatus.OFF_DUTY, BREAK_LENGTH)
                window_used += BREAK_LENGTH
                since_break = 0

        # Leg driving done — now the on-duty event that follows it (pickup/dropoff).
        if leg.event_after:
            on_duty_event(leg.event_after, leg.event_minutes)

    return segments