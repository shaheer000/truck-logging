"""FMCSA Hours-of-Service scheduling engine.

Pure Python, no Django dependency, so it is trivially unit-testable. Produces a
flat list of duty Events for a trip, applying the property-carrying 70-hr/8-day
rules described in PRODUCT_DESIGN.md Section 3.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from . import routing

# ── HOS constants (FMCSA § 395.3) ────────────────────────────────────────────
MAX_DRIVING_PER_SHIFT = 11.0
MAX_DUTY_WINDOW = 14.0
MIN_OFF_DUTY_RESET = 10.0
BREAK_TRIGGER_HOURS = 8.0
BREAK_DURATION = 0.5
CYCLE_LIMIT = 70.0
RESTART_HOURS = 34.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_DURATION = 0.5
PICKUP_DROPOFF_DURATION = 1.0
PRE_TRIP_INSPECTION = 0.5
POST_TRIP_INSPECTION = 0.5
AVG_TRUCK_SPEED_MPH = 55.0

# Duty statuses
OFF_DUTY = "off_duty"
SLEEPER_BERTH = "sleeper_berth"
DRIVING = "driving"
ON_DUTY_ND = "on_duty_not_driving"


@dataclass
class Event:
    status: str
    start_time: datetime
    duration_hrs: float
    location: str
    lat: float
    lon: float
    remarks: str
    miles: float = 0.0

    @property
    def end_time(self):
        return self.start_time + timedelta(hours=self.duration_hrs)


@dataclass
class _State:
    clock: datetime
    cycle_used: float
    shift_drive_hrs: float = 0.0
    shift_duty_hrs: float = 0.0
    drive_since_break: float = 0.0
    miles_since_fuel: float = 0.0
    events: list = field(default_factory=list)


@dataclass
class TripInput:
    current: dict   # {lat, lon, address}
    pickup: dict
    dropoff: dict
    cycle_used_hours: float
    start_time: datetime = None


def _add(state, status, location, lat, lon, duration, remarks, miles=0.0):
    state.events.append(
        Event(
            status=status,
            start_time=state.clock,
            duration_hrs=duration,
            location=location,
            lat=lat,
            lon=lon,
            remarks=remarks,
            miles=miles,
        )
    )
    state.clock += timedelta(hours=duration)


def _insert_10hr_break(state, location, lat, lon):
    _add(state, OFF_DUTY, location, lat, lon, 1.5, "Off duty - break")
    _add(state, SLEEPER_BERTH, location, lat, lon, 8.5, "Sleeper berth rest")
    state.shift_drive_hrs = 0.0
    state.shift_duty_hrs = 0.0
    state.drive_since_break = 0.0


def _insert_34hr_restart(state, location, lat, lon):
    _add(state, OFF_DUTY, location, lat, lon, 10.0, "34-hr restart - off duty")
    _add(state, SLEEPER_BERTH, location, lat, lon, 24.0, "34-hr restart - sleeper berth")
    state.cycle_used = 0.0
    state.shift_drive_hrs = 0.0
    state.shift_duty_hrs = 0.0
    state.drive_since_break = 0.0


def _drive_segment(state, start_coord, end_coord, dest_name, total_miles, purpose):
    miles_remaining = total_miles
    guard = 0
    while miles_remaining > 0.01:
        guard += 1
        if guard > 1000:
            raise RuntimeError("HOS scheduling did not converge")

        pos_fraction = 1.0 - (miles_remaining / total_miles) if total_miles else 1.0
        pos = routing.interpolate_position(start_coord, end_coord, pos_fraction)

        if state.cycle_used >= CYCLE_LIMIT:
            _insert_34hr_restart(state, "Restart location", pos["lat"], pos["lon"])
        if state.shift_duty_hrs >= MAX_DUTY_WINDOW:
            _insert_10hr_break(state, "Rest area", pos["lat"], pos["lon"])
        if state.shift_drive_hrs >= MAX_DRIVING_PER_SHIFT:
            _insert_10hr_break(state, "Rest area", pos["lat"], pos["lon"])
        if state.drive_since_break >= BREAK_TRIGGER_HOURS:
            _add(state, OFF_DUTY, "Rest stop", pos["lat"], pos["lon"],
                 BREAK_DURATION, "30-min rest break (8-hr driving rule)")
            state.drive_since_break = 0.0
        if state.miles_since_fuel >= FUEL_INTERVAL_MILES:
            _add(state, ON_DUTY_ND, "Fuel stop", pos["lat"], pos["lon"],
                 FUEL_STOP_DURATION, "Fuel stop")
            state.miles_since_fuel = 0.0
            state.shift_duty_hrs += FUEL_STOP_DURATION
            state.cycle_used += FUEL_STOP_DURATION

        hours_before_window = MAX_DUTY_WINDOW - state.shift_duty_hrs
        hours_before_drive = MAX_DRIVING_PER_SHIFT - state.shift_drive_hrs
        hours_before_break = BREAK_TRIGGER_HOURS - state.drive_since_break
        hours_before_fuel = (FUEL_INTERVAL_MILES - state.miles_since_fuel) / AVG_TRUCK_SPEED_MPH
        hours_before_cycle = CYCLE_LIMIT - state.cycle_used
        hours_to_dest = miles_remaining / AVG_TRUCK_SPEED_MPH

        max_drive = min(
            hours_before_window,
            hours_before_drive,
            hours_before_break,
            hours_before_fuel,
            hours_before_cycle,
            hours_to_dest,
        )

        if max_drive <= 0.01:
            # No driving headroom. Reset whichever limit is binding so the next
            # loop pass can make progress.
            if state.cycle_used >= CYCLE_LIMIT - 0.01:
                _insert_34hr_restart(state, "Restart location", pos["lat"], pos["lon"])
            elif state.drive_since_break >= BREAK_TRIGGER_HOURS - 0.01:
                _add(state, OFF_DUTY, "Rest stop", pos["lat"], pos["lon"],
                     BREAK_DURATION, "30-min rest break (8-hr driving rule)")
                state.drive_since_break = 0.0
            else:
                _insert_10hr_break(state, "Rest area", pos["lat"], pos["lon"])
            continue

        miles_driven = max_drive * AVG_TRUCK_SPEED_MPH
        _add(state, DRIVING, f"En route to {dest_name}", pos["lat"], pos["lon"],
             max_drive, purpose, miles=miles_driven)

        state.shift_drive_hrs += max_drive
        state.shift_duty_hrs += max_drive
        state.drive_since_break += max_drive
        state.miles_since_fuel += miles_driven
        state.cycle_used += max_drive
        miles_remaining -= miles_driven


def calculate_trip(trip, leg_distances):
    """Run the HOS schedule.

    `trip` is a TripInput. `leg_distances` is {current_to_pickup, pickup_to_dropoff}
    in miles (computed by the caller from the routing service).
    """
    start = trip.start_time or datetime.now().replace(
        hour=6, minute=0, second=0, microsecond=0
    )
    state = _State(clock=start, cycle_used=trip.cycle_used_hours)

    cur = (trip.current["lat"], trip.current["lon"])
    pick = (trip.pickup["lat"], trip.pickup["lon"])
    drop = (trip.dropoff["lat"], trip.dropoff["lon"])

    # Pre-trip inspection
    _add(state, ON_DUTY_ND, trip.current["address"], cur[0], cur[1],
         PRE_TRIP_INSPECTION, "Pre-trip inspection")
    state.shift_duty_hrs += PRE_TRIP_INSPECTION
    state.cycle_used += PRE_TRIP_INSPECTION

    # Current -> Pickup
    _drive_segment(state, cur, pick, trip.pickup["address"],
                   leg_distances["current_to_pickup"], "En route to pickup")

    # Pickup stop
    _add(state, ON_DUTY_ND, trip.pickup["address"], pick[0], pick[1],
         PICKUP_DROPOFF_DURATION, "Pickup - loading freight")
    state.shift_duty_hrs += PICKUP_DROPOFF_DURATION
    state.cycle_used += PICKUP_DROPOFF_DURATION

    # Pickup -> Dropoff
    _drive_segment(state, pick, drop, trip.dropoff["address"],
                   leg_distances["pickup_to_dropoff"], "En route to dropoff")

    # Dropoff stop
    _add(state, ON_DUTY_ND, trip.dropoff["address"], drop[0], drop[1],
         PICKUP_DROPOFF_DURATION, "Dropoff - unloading freight")
    state.shift_duty_hrs += PICKUP_DROPOFF_DURATION
    state.cycle_used += PICKUP_DROPOFF_DURATION

    # Post-trip inspection
    _add(state, ON_DUTY_ND, trip.dropoff["address"], drop[0], drop[1],
         POST_TRIP_INSPECTION, "Post-trip inspection")
    state.shift_duty_hrs += POST_TRIP_INSPECTION
    state.cycle_used += POST_TRIP_INSPECTION

    return state.events
