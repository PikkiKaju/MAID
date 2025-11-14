from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from network.models import GraphPreset
from network.serializers import GraphPresetSerializer


class GraphPresetViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = GraphPresetSerializer
    queryset = GraphPreset.objects.all()