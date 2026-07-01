# planner/routing.py
# OpenRouteService integration: turn location strings into real leg
# distances/durations the engine can consume.

import os
import requests

# Read the API key from the environment. Never hardcode secrets — this is
# both a security practice and an interview talking point.
ORS_API_KEY = os.environ.get("ORS_API_KEY")

GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"
DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv"

# Conversion constants — ORS returns metric, our engine is imperial + minutes.
METERS_PER_MILE = 1609.34
SECONDS_PER_MINUTE = 60


# A small custom error so the view can catch integration problems specifically
# and return a clean 400, instead of leaking a raw traceback as a 500.
class RoutingError(Exception):
    pass


def geocode(location_str):
    # Turn a location string ("Dallas, TX") into [longitude, latitude].
    if not ORS_API_KEY:
        raise RoutingError("ORS_API_KEY is not set")

    params = {
        "api_key": ORS_API_KEY,
        "text": location_str,
        "size": 1,               # only need the single best match
    }

    try:
        resp = requests.get(GEOCODE_URL, params=params, timeout=15)
        resp.raise_for_status()  # turns a 4xx/5xx HTTP status into an exception
    except requests.RequestException as e:
        # Network failure, timeout, bad status — all funnel to one clear error.
        raise RoutingError(f"Geocoding request failed for '{location_str}': {e}")

    data = resp.json()
    features = data.get("features", [])
    if not features:
        # The address was valid HTTP-wise but matched nothing.
        raise RoutingError(f"No location found for '{location_str}'")

    # ORS returns coordinates as [lon, lat] — keep that order for directions.
    return features[0]["geometry"]["coordinates"]


def get_leg(start_coords, end_coords):
    # Returns (distance_miles, duration_minutes, geometry) where geometry is
    # the encoded polyline string ORS gives for the road path.
    if not ORS_API_KEY:
        raise RoutingError("ORS_API_KEY is not set")

    headers = {"Authorization": ORS_API_KEY}
    body = {"coordinates": [start_coords, end_coords]}

    try:
        resp = requests.post(DIRECTIONS_URL, json=body, headers=headers, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise RoutingError(f"Directions request failed: {e}")

    data = resp.json()
    routes = data.get("routes", [])
    if not routes:
        raise RoutingError("No route found between the two points")

    summary = routes[0]["summary"]
    distance_miles = summary["distance"] / METERS_PER_MILE
    duration_minutes = summary["duration"] / SECONDS_PER_MINUTE
    geometry = routes[0]["geometry"]   # encoded polyline of the road path
    return distance_miles, duration_minutes, geometry