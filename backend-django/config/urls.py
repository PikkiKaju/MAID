from django.urls import include, path
from .health import health

urlpatterns = [
    path("api/", include("regressor.urls")),
    path("api/network/", include("network.urls")),
    path("health/", health),
]
