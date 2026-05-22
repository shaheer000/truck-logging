"""Geocoding and routing helpers.

Uses Nominatim for geocoding and OpenRouteService (driving-hgv) for routes.
If no ORS API key is configured, route distance falls back to a haversine
estimate with a straight-line geometry so the app works end-to-end offline.
"""
import math

import requests
from django.conf import settings

EARTH_RADIUS_MI = 3958.8
_TIMEOUT = 15


def haversine(coord1, coord2):
    """Great-circle distance in miles. Coords are (lat, lon) tuples."""
    lat1, lon1 = map(math.radians, coord1)
    lat2, lon2 = map(math.radians, coord2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_MI * 2 * math.asin(math.sqrt(a))


def interpolate_position(start, end, fraction):
    """Linear interpolation between two (lat, lon) points."""
    fraction = max(0.0, min(1.0, fraction))
    return {
        "lat": start[0] + (end[0] - start[0]) * fraction,
        "lon": start[1] + (end[1] - start[1]) * fraction,
    }


def geocode(address):
    """Resolve an address to {lat, lon, display_name} via Nominatim."""
    resp = requests.get(
        f"{settings.NOMINATIM_BASE_URL}/search",
        params={"q": address, "format": "json", "limit": 1},
        headers={"User-Agent": settings.APP_USER_AGENT},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        return None
    top = results[0]
    return {
        "lat": float(top["lat"]),
        "lon": float(top["lon"]),
        "display_name": top["display_name"],
    }


def reverse_geocode(lat, lon):
    """Resolve (lat, lon) to a human-readable address via Nominatim."""
    resp = requests.get(
        f"{settings.NOMINATIM_BASE_URL}/reverse",
        params={"lat": lat, "lon": lon, "format": "json"},
        headers={"User-Agent": settings.APP_USER_AGENT},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json().get("display_name")


def _haversine_route(waypoints):
    """Fallback route: straight segments, distance via haversine, 55 mph."""
    total_miles = 0.0
    coordinates = []
    for i in range(len(waypoints) - 1):
        total_miles += haversine(waypoints[i], waypoints[i + 1])
    for lat, lon in waypoints:
        coordinates.append([lon, lat])
    return {
        "distance_miles": round(total_miles, 1),
        "duration_hrs": round(total_miles / 55.0, 2),
        "geometry": {"type": "LineString", "coordinates": coordinates},
        "source": "haversine",
    }


def get_route(waypoints):
    """Get a truck route through ordered (lat, lon) waypoints.

    Returns {distance_miles, duration_hrs, geometry, source}. Falls back to a
    haversine estimate when ORS is unavailable or unconfigured.
    """
    if not settings.ORS_API_KEY:
        return _haversine_route(waypoints)

    try:
        resp = requests.post(
            f"{settings.ORS_BASE_URL}/v2/directions/driving-hgv/geojson",
            json={"coordinates": [[lon, lat] for lat, lon in waypoints]},
            headers={
                "Authorization": settings.ORS_API_KEY,
                "Content-Type": "application/json",
                "User-Agent": settings.APP_USER_AGENT,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        feature = resp.json()["features"][0]
        summary = feature["properties"]["summary"]
        return {
            "distance_miles": round(summary["distance"] / 1609.344, 1),
            "duration_hrs": round(summary["duration"] / 3600.0, 2),
            "geometry": feature["geometry"],
            "source": "ors",
        }
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return _haversine_route(waypoints)
