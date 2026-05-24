import uuid

from django.conf import settings
from django.db import models


class DriverProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="driver_profile"
    )
    full_name = models.CharField(max_length=120)
    license_number = models.CharField(max_length=40, blank=True)
    carrier = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.user.username})"


class Trip(models.Model):
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trips",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    current_lat = models.FloatField()
    current_lon = models.FloatField()
    current_address = models.CharField(max_length=255)
    pickup_lat = models.FloatField()
    pickup_lon = models.FloatField()
    pickup_address = models.CharField(max_length=255)
    dropoff_lat = models.FloatField()
    dropoff_lon = models.FloatField()
    dropoff_address = models.CharField(max_length=255)
    cycle_used_hours = models.FloatField()
    total_distance_miles = models.FloatField(null=True, blank=True)
    total_trip_hours = models.FloatField(null=True, blank=True)
    days_required = models.PositiveIntegerField(null=True, blank=True)
    route_geometry = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Trip {self.id} | {self.pickup_address} -> {self.dropoff_address}"


class Stop(models.Model):
    STOP_TYPES = [
        ("current", "Current Location"),
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
        ("rest_30min", "30-Min Rest Break"),
        ("rest_10hr", "10-Hr Mandatory Rest"),
        ("rest_34hr", "34-Hr Restart"),
        ("fuel", "Fuel Stop"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    sequence = models.PositiveIntegerField()
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    name = models.CharField(max_length=255)
    lat = models.FloatField()
    lon = models.FloatField()
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    duration_hrs = models.FloatField()
    miles_from_prev = models.FloatField(default=0)
    activity = models.CharField(max_length=255)

    class Meta:
        ordering = ["sequence"]

    def __str__(self):
        return f"Stop {self.sequence} ({self.stop_type}) - {self.name}"


class LogSheet(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="log_sheets")
    day_number = models.PositiveIntegerField()
    date = models.DateField()
    total_miles = models.FloatField(default=0)
    events = models.JSONField(default=list)
    totals = models.JSONField(default=dict)
    recap = models.JSONField(default=dict)
    header = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["day_number"]

    def __str__(self):
        return f"Log Sheet Day {self.day_number} ({self.date}) - Trip {self.trip_id}"
