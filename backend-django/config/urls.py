from django.urls import include, path

urlpatterns = [
    path("api/", include("regressor.urls")),
    path("api/network/", include("network.urls")),
]
