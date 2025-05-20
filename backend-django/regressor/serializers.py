# regressor/serializers.py
# If we need to handle complex data structures, serializers can be added here.
from rest_framework import serializers

class RegressionSerializer(serializers.Serializer):
    X = serializers.ListField(child=serializers.FloatField(), required=True)
    y = serializers.ListField(child=serializers.FloatField(), required=True)
    degree = serializers.IntegerField(required=False, default=2)
