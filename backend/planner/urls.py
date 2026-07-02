from django.urls import path
from .views import plan_trip, explain_trip

urlpatterns = [
    path("plan/", plan_trip),
    path("explain/", explain_trip),
]