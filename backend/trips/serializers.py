from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import DriverProfile, LogSheet, Stop, Trip


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, write_only=True)
    full_name = serializers.CharField(max_length=120)
    license_number = serializers.CharField(max_length=40, required=False, allow_blank=True)
    carrier = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    @transaction.atomic
    def create(self, data):
        user = User.objects.create_user(
            username=data["username"], password=data["password"]
        )
        DriverProfile.objects.create(
            user=user,
            full_name=data["full_name"],
            license_number=data.get("license_number", ""),
            carrier=data.get("carrier", ""),
        )
        return user


class DriverSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = DriverProfile
        fields = ["username", "full_name", "license_number", "carrier"]


class TripHistorySerializer(serializers.ModelSerializer):
    trip_id = serializers.UUIDField(source="id")

    class Meta:
        model = Trip
        fields = [
            "trip_id", "status", "current_address", "pickup_address",
            "dropoff_address", "total_distance_miles", "total_trip_hours",
            "days_required", "created_at",
        ]


class LocationSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=255)
    lat = serializers.FloatField()
    lon = serializers.FloatField()


class TripInputSerializer(serializers.Serializer):
    current_location = LocationSerializer()
    pickup_location = LocationSerializer()
    dropoff_location = LocationSerializer()
    cycle_used_hours = serializers.FloatField(min_value=0, max_value=70)


class StopSerializer(serializers.ModelSerializer):
    arrival = serializers.DateTimeField(source="arrival_time")
    departure = serializers.DateTimeField(source="departure_time")
    type = serializers.CharField(source="stop_type")

    class Meta:
        model = Stop
        fields = [
            "sequence", "type", "name", "lat", "lon",
            "arrival", "departure", "duration_hrs", "miles_from_prev", "activity",
        ]


class LogSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogSheet
        fields = ["day_number", "date", "total_miles", "events", "totals", "recap"]


class TripOutputSerializer(serializers.ModelSerializer):
    trip_id = serializers.UUIDField(source="id")
    stops = StopSerializer(many=True, read_only=True)
    log_sheets = LogSheetSerializer(many=True, read_only=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = ["trip_id", "status", "summary", "route_geometry", "stops", "log_sheets"]

    def get_summary(self, obj):
        trip_hours = obj.total_trip_hours or 0
        return {
            "total_distance_miles": obj.total_distance_miles,
            "total_trip_hours": trip_hours,
            "days_required": obj.days_required,
            "cycle_hours_after": round(obj.cycle_used_hours + trip_hours, 1),
            "hours_remaining_in_cycle": round(max(0, 70 - obj.cycle_used_hours - trip_hours), 1),
        }
