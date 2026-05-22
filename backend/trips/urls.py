from django.urls import path

from .views import (
    LoginView,
    LogSheetsView,
    MeView,
    RegisterView,
    TripCalculationView,
    TripConfirmView,
    TripDetailView,
    TripHistoryView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("trips/", TripHistoryView.as_view(), name="trip-history"),
    path("trip/calculate/", TripCalculationView.as_view(), name="trip-calculate"),
    path("trip/<uuid:pk>/", TripDetailView.as_view(), name="trip-detail"),
    path("trip/<uuid:pk>/logs/", LogSheetsView.as_view(), name="trip-logs"),
    path("trip/<uuid:pk>/confirm/", TripConfirmView.as_view(), name="trip-confirm"),
]
