from datetime import datetime

from django.test import TestCase
from rest_framework.test import APIClient

from . import hos_engine, log_renderer
from .hos_engine import DRIVING, OFF_DUTY, ON_DUTY_ND, SLEEPER_BERTH, TripInput
from .models import Trip


def _trip(cycle=0.0):
    return TripInput(
        current={"lat": 41.8781, "lon": -87.6298, "address": "Chicago, IL"},
        pickup={"lat": 43.0389, "lon": -87.9065, "address": "Milwaukee, WI"},
        dropoff={"lat": 39.7684, "lon": -86.1581, "address": "Indianapolis, IN"},
        cycle_used_hours=cycle,
        start_time=datetime(2026, 5, 22, 6, 0, 0),
    )


class HOSEngineTests(TestCase):
    def test_short_trip_no_break(self):
        # ~90 miles total: under 8 driving hrs, no 30-min break should appear.
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 90, "pickup_to_dropoff": 0,
        })
        breaks = [e for e in events if "30-min" in e.remarks]
        self.assertEqual(breaks, [])

    def test_30min_break_trigger(self):
        # 600 miles ~ 10.9 driving hrs -> exceeds 8-hr cumulative driving.
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 600, "pickup_to_dropoff": 0,
        })
        breaks = [e for e in events if "30-min" in e.remarks]
        self.assertTrue(len(breaks) >= 1)

    def test_11hr_driving_limit_forces_10hr_break(self):
        # 800 miles ~ 14.5 driving hrs -> must hit the 11-hr cap and reset.
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 800, "pickup_to_dropoff": 0,
        })
        ten_hr = [e for e in events if e.status == SLEEPER_BERTH and e.duration_hrs == 8.5]
        self.assertTrue(len(ten_hr) >= 1)
        # No single driving event should exceed 11 hrs.
        for e in events:
            if e.status == DRIVING:
                self.assertLessEqual(e.duration_hrs, 11.0 + 1e-6)

    def test_fuel_stop_insertion(self):
        # 1500 miles -> at least one fuel stop (every 1000 mi).
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 1500, "pickup_to_dropoff": 0,
        })
        fuel = [e for e in events if e.remarks == "Fuel stop"]
        self.assertTrue(len(fuel) >= 1)

    def test_cycle_limit_restart(self):
        # Start near the 70-hr cap with a long trip -> 34-hr restart inserted.
        events = hos_engine.calculate_trip(_trip(cycle=68.0), {
            "current_to_pickup": 400, "pickup_to_dropoff": 0,
        })
        restart = [e for e in events if "restart" in e.remarks.lower()]
        self.assertTrue(len(restart) >= 1)

    def test_segment_sequence_present(self):
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 90, "pickup_to_dropoff": 180,
        })
        remarks = [e.remarks for e in events]
        self.assertIn("Pre-trip inspection", remarks)
        self.assertIn("Pickup - loading freight", remarks)
        self.assertIn("Dropoff - unloading freight", remarks)
        self.assertIn("Post-trip inspection", remarks)


class LogRendererTests(TestCase):
    def test_each_day_sums_to_24(self):
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 600, "pickup_to_dropoff": 400,
        })
        sheets = log_renderer.generate_log_sheets(events)
        self.assertTrue(len(sheets) >= 1)
        for sheet in sheets:
            total = sum(sheet["totals"].values())
            self.assertAlmostEqual(total, 24.0, places=1)

    def test_multi_day_trip_produces_multiple_sheets(self):
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 900, "pickup_to_dropoff": 0,
        })
        sheets = log_renderer.generate_log_sheets(events)
        self.assertTrue(len(sheets) >= 2)

    def test_build_stops_starts_with_current(self):
        events = hos_engine.calculate_trip(_trip(), {
            "current_to_pickup": 90, "pickup_to_dropoff": 180,
        })
        stops = log_renderer.build_stops(events, _trip())
        self.assertEqual(stops[0]["stop_type"], "current")
        self.assertEqual(stops[-1]["stop_type"], "dropoff")


_TRIP_PAYLOAD = {
    "current_location": {"address": "Chicago, IL", "lat": 41.8781, "lon": -87.6298},
    "pickup_location": {"address": "Milwaukee, WI", "lat": 43.0389, "lon": -87.9065},
    "dropoff_location": {"address": "Indianapolis, IN", "lat": 39.7684, "lon": -86.1581},
    "cycle_used_hours": 20,
}


class AuthAndHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register(self, username="driver1"):
        resp = self.client.post("/api/auth/register/", {
            "username": username, "password": "secret123", "full_name": "Test Driver",
        }, format="json")
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()["token"]

    def test_calculate_requires_auth(self):
        resp = self.client.post("/api/trip/calculate/", _TRIP_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, 401)

    def test_register_login_and_calculate(self):
        token = self._register()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        resp = self.client.post("/api/trip/calculate/", _TRIP_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["status"], "pending")

    def test_confirm_and_history_filter(self):
        token = self._register()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        trip_id = self.client.post(
            "/api/trip/calculate/", _TRIP_PAYLOAD, format="json"
        ).json()["trip_id"]

        # Before confirming, the confirmed-only history is empty.
        confirmed = self.client.get("/api/trips/?status=confirmed").json()["trips"]
        self.assertEqual(len(confirmed), 0)

        self.client.post(f"/api/trip/{trip_id}/confirm/")
        confirmed = self.client.get("/api/trips/?status=confirmed").json()["trips"]
        self.assertEqual(len(confirmed), 1)
        self.assertEqual(confirmed[0]["status"], "confirmed")

    def test_trips_are_owner_scoped(self):
        token_a = self._register("alice")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_a}")
        trip_id = self.client.post(
            "/api/trip/calculate/", _TRIP_PAYLOAD, format="json"
        ).json()["trip_id"]

        token_b = self._register("bob")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_b}")
        resp = self.client.get(f"/api/trip/{trip_id}/")
        self.assertEqual(resp.status_code, 404)
