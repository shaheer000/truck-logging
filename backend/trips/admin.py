from django.contrib import admin

from .models import DriverProfile, LogSheet, Stop, Trip


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "carrier", "license_number", "created_at")


class StopInline(admin.TabularInline):
    model = Stop
    extra = 0


class LogSheetInline(admin.TabularInline):
    model = LogSheet
    extra = 0


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "status", "pickup_address", "dropoff_address", "days_required", "created_at")
    list_filter = ("status",)
    inlines = [StopInline, LogSheetInline]


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    list_display = ("trip", "sequence", "stop_type", "name", "duration_hrs")


@admin.register(LogSheet)
class LogSheetAdmin(admin.ModelAdmin):
    list_display = ("trip", "day_number", "date", "total_miles")
