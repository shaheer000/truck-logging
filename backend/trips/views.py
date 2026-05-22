from datetime import datetime

from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import hos_engine, log_renderer, routing
from .models import LogSheet, Stop, Trip
from .serializers import (
    DriverSerializer,
    LogSheetSerializer,
    RegisterSerializer,
    TripHistorySerializer,
    TripInputSerializer,
    TripOutputSerializer,
)


def _driver_payload(user):
    profile = getattr(user, "driver_profile", None)
    return DriverSerializer(profile).data if profile else {"username": user.username}


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "validation_error", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "driver": _driver_payload(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            username=request.data.get("username"),
            password=request.data.get("password"),
        )
        if user is None:
            return Response(
                {"error": "invalid_credentials", "detail": "Wrong username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "driver": _driver_payload(user)})


class MeView(APIView):
    def get(self, request):
        return Response({"driver": _driver_payload(request.user)})


class TripCalculationView(APIView):
    def post(self, request):
        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "validation_error", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        current = data["current_location"]
        pickup = data["pickup_location"]
        dropoff = data["dropoff_location"]

        # Routing: full geometry across all three waypoints, plus per-leg distances.
        try:
            full = routing.get_route([
                (current["lat"], current["lon"]),
                (pickup["lat"], pickup["lon"]),
                (dropoff["lat"], dropoff["lon"]),
            ])
            leg1 = routing.get_route([
                (current["lat"], current["lon"]),
                (pickup["lat"], pickup["lon"]),
            ])
            leg2 = routing.get_route([
                (pickup["lat"], pickup["lon"]),
                (dropoff["lat"], dropoff["lon"]),
            ])
        except Exception:
            return Response(
                {"error": "routing_unavailable",
                 "detail": "Could not calculate a route for the given locations."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        trip_input = hos_engine.TripInput(
            current=current,
            pickup=pickup,
            dropoff=dropoff,
            cycle_used_hours=data["cycle_used_hours"],
            start_time=datetime.now().replace(hour=6, minute=0, second=0, microsecond=0),
        )
        events = hos_engine.calculate_trip(trip_input, {
            "current_to_pickup": leg1["distance_miles"],
            "pickup_to_dropoff": leg2["distance_miles"],
        })

        sheets = log_renderer.generate_log_sheets(events)
        stops = log_renderer.build_stops(events, trip_input)

        total_hrs = round(
            sum(e.duration_hrs for e in events), 1
        ) if events else 0

        with transaction.atomic():
            trip = Trip.objects.create(
                driver=request.user,
                current_lat=current["lat"], current_lon=current["lon"],
                current_address=current["address"],
                pickup_lat=pickup["lat"], pickup_lon=pickup["lon"],
                pickup_address=pickup["address"],
                dropoff_lat=dropoff["lat"], dropoff_lon=dropoff["lon"],
                dropoff_address=dropoff["address"],
                cycle_used_hours=data["cycle_used_hours"],
                total_distance_miles=full["distance_miles"],
                total_trip_hours=total_hrs,
                days_required=len(sheets),
                route_geometry=full["geometry"],
            )
            Stop.objects.bulk_create([
                Stop(
                    trip=trip,
                    sequence=s["sequence"],
                    stop_type=s["stop_type"],
                    name=s["name"][:255],
                    lat=s["lat"],
                    lon=s["lon"],
                    arrival_time=s["arrival"],
                    departure_time=s["departure"],
                    duration_hrs=s["duration_hrs"],
                    miles_from_prev=s["miles_from_prev"],
                    activity=s["activity"][:255],
                )
                for s in stops
            ])
            LogSheet.objects.bulk_create([
                LogSheet(
                    trip=trip,
                    day_number=sheet["day_number"],
                    date=sheet["date"],
                    total_miles=sheet["total_miles"],
                    events=sheet["events"],
                    totals=sheet["totals"],
                    recap=sheet["recap"],
                )
                for sheet in sheets
            ])

        trip.refresh_from_db()
        return Response(TripOutputSerializer(trip).data, status=status.HTTP_200_OK)


def _owned_trip_or_none(request, pk):
    return Trip.objects.filter(pk=pk, driver=request.user).first()


class TripDetailView(APIView):
    def get(self, request, pk):
        trip = _owned_trip_or_none(request, pk)
        if trip is None:
            return Response(
                {"error": "not_found", "detail": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TripOutputSerializer(trip).data)


class LogSheetsView(APIView):
    def get(self, request, pk):
        trip = _owned_trip_or_none(request, pk)
        if trip is None:
            return Response(
                {"error": "not_found", "detail": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        sheets = trip.log_sheets.all()
        return Response({"log_sheets": LogSheetSerializer(sheets, many=True).data})


class TripConfirmView(APIView):
    def post(self, request, pk):
        trip = _owned_trip_or_none(request, pk)
        if trip is None:
            return Response(
                {"error": "not_found", "detail": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        trip.status = Trip.STATUS_CONFIRMED
        trip.save(update_fields=["status"])
        return Response({"trip_id": str(trip.id), "status": trip.status})


class TripHistoryView(APIView):
    def get(self, request):
        qs = Trip.objects.filter(driver=request.user)
        if request.query_params.get("status") == "confirmed":
            qs = qs.filter(status=Trip.STATUS_CONFIRMED)
        return Response({"trips": TripHistorySerializer(qs, many=True).data})
