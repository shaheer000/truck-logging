"""Transform a flat event stream into daily log sheets and a stop list."""
from datetime import datetime, time, timedelta

from .hos_engine import DRIVING, OFF_DUTY, ON_DUTY_ND, SLEEPER_BERTH

# Map an event status + remark to a user-facing stop type / icon category.
_STOP_TYPE_BY_REMARK = {
    "Pre-trip inspection": None,  # not a standalone map stop
    "Post-trip inspection": None,
    "Pickup - loading freight": "pickup",
    "Dropoff - unloading freight": "dropoff",
    "Fuel stop": "fuel",
    "30-min rest break (8-hr driving rule)": "rest_30min",
}


def _split_at_midnight(events):
    """Split any event spanning midnight into per-calendar-day pieces."""
    pieces = []
    for ev in events:
        start = ev.start_time
        end = ev.end_time
        cursor = start
        while cursor.date() < end.date():
            next_midnight = datetime.combine(
                cursor.date() + timedelta(days=1), time.min, tzinfo=cursor.tzinfo
            )
            pieces.append((ev, cursor, next_midnight))
            cursor = next_midnight
        pieces.append((ev, cursor, end))
    return pieces


def _fmt(dt):
    return dt.strftime("%H:%M")


def generate_log_sheets(events):
    """Return a list of log-sheet dicts (one per calendar day)."""
    if not events:
        return []

    pieces = _split_at_midnight(events)

    # Group pieces by calendar date.
    by_date = {}
    for ev, seg_start, seg_end in pieces:
        by_date.setdefault(seg_start.date(), []).append((ev, seg_start, seg_end))

    ordered_dates = sorted(by_date)
    sheets = []
    on_duty_history = []  # (date, on_duty_hours) for rolling recap

    for day_number, day in enumerate(ordered_dates, start=1):
        segments = by_date[day]
        day_events = []
        totals = {
            "off_duty_hrs": 0.0,
            "sleeper_berth_hrs": 0.0,
            "driving_hrs": 0.0,
            "on_duty_not_driving_hrs": 0.0,
        }
        total_miles = 0.0

        for ev, seg_start, seg_end in segments:
            dur = (seg_end - seg_start).total_seconds() / 3600.0
            remark = ev.remarks
            if seg_start.date() != ev.start_time.date():
                remark = f"{remark} (cont.)"
            day_events.append({
                "status": ev.status,
                "start_time": _fmt(seg_start),
                "end_time": "23:59" if seg_end.time() == time.min and seg_end.date() > day else _fmt(seg_end),
                "location": ev.location,
                "remarks": remark,
            })
            if ev.status == OFF_DUTY:
                totals["off_duty_hrs"] += dur
            elif ev.status == SLEEPER_BERTH:
                totals["sleeper_berth_hrs"] += dur
            elif ev.status == DRIVING:
                totals["driving_hrs"] += dur
                # Apportion miles by time fraction of the driving event.
                if ev.duration_hrs:
                    total_miles += ev.miles * (dur / ev.duration_hrs)
            elif ev.status == ON_DUTY_ND:
                totals["on_duty_not_driving_hrs"] += dur

        # Pad the start of the day with off-duty if events don't begin at 00:00.
        first_start = segments[0][1]
        midnight = datetime.combine(day, time.min, tzinfo=first_start.tzinfo)
        gap = (first_start - midnight).total_seconds() / 3600.0
        if gap > 0.001:
            day_events.insert(0, {
                "status": OFF_DUTY,
                "start_time": "00:00",
                "end_time": _fmt(first_start),
                "location": segments[0][0].location,
                "remarks": "Off duty",
            })
            totals["off_duty_hrs"] += gap

        # Pad the tail so the day sums to 24.0.
        summed = sum(totals.values())
        if summed < 24.0 - 0.001:
            remainder = 24.0 - summed
            totals["off_duty_hrs"] += remainder
            last_end = segments[-1][2]
            day_events.append({
                "status": OFF_DUTY,
                "start_time": _fmt(last_end),
                "end_time": "23:59",
                "location": segments[-1][0].location,
                "remarks": "Off duty",
            })

        for key in totals:
            totals[key] = round(totals[key], 2)

        on_duty_today = round(totals["driving_hrs"] + totals["on_duty_not_driving_hrs"], 2)
        last_7 = sum(h for d, h in on_duty_history if (day - d).days < 7)
        recap = {
            "on_duty_today": on_duty_today,
            "on_duty_last_7_days": round(last_7 + on_duty_today, 2),
            "hours_available_70cap": round(max(0.0, 70.0 - (last_7 + on_duty_today)), 2),
        }
        on_duty_history.append((day, on_duty_today))

        sheets.append({
            "day_number": day_number,
            "date": day.isoformat(),
            "total_miles": round(total_miles),
            "events": day_events,
            "totals": totals,
            "recap": recap,
        })

    return sheets


def build_stops(events, trip_input):
    """Derive the ordered map/timeline stop list from events."""
    stops = []
    seq = 1

    # Stop 1 is always the current location (pre-trip inspection event).
    stops.append({
        "sequence": seq,
        "stop_type": "current",
        "name": trip_input.current["address"],
        "lat": trip_input.current["lat"],
        "lon": trip_input.current["lon"],
        "arrival": None,
        "departure": events[0].end_time.isoformat() if events else None,
        "duration_hrs": 0.5,
        "miles_from_prev": 0,
        "activity": "Pre-trip inspection",
    })
    seq += 1

    miles_accum = 0.0
    for ev in events:
        if ev.status == DRIVING:
            miles_accum += ev.miles
            continue
        stop_type = _STOP_TYPE_BY_REMARK.get(ev.remarks, "unknown")
        if ev.remarks == "Pre-trip inspection":
            continue
        if ev.status == SLEEPER_BERTH:
            continue  # paired with its preceding off-duty event
        if "restart" in ev.remarks.lower():
            stop_type = "rest_34hr"
        elif ev.remarks.startswith("Off duty - break") or ev.remarks == "Off duty":
            stop_type = "rest_10hr"

        if stop_type is None:
            continue

        stops.append({
            "sequence": seq,
            "stop_type": stop_type,
            "name": ev.location,
            "lat": ev.lat,
            "lon": ev.lon,
            "arrival": ev.start_time.isoformat(),
            "departure": ev.end_time.isoformat(),
            "duration_hrs": round(ev.duration_hrs, 2),
            "miles_from_prev": round(miles_accum),
            "activity": ev.remarks,
        })
        miles_accum = 0.0
        seq += 1

    return stops
