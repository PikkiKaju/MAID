from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from network.models import GraphSnapshot
from network.serializers import GraphSnapshotSerializer


class GraphSnapshotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GraphSnapshotSerializer
    queryset = GraphSnapshot.objects.select_related("graph")