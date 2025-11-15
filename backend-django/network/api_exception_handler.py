from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status

from .services.types import GraphValidationError


def custom_exception_handler(exc, context):
    """Custom DRF exception handler.

    - Convert GraphValidationError to a 400 response with the structured detail.
    - Delegate other exceptions to DRF's default handler.
    """
    # Handle GraphValidationError specifically
    if isinstance(exc, GraphValidationError):
        detail = getattr(exc, "detail", str(exc))
        return Response(detail, status=status.HTTP_400_BAD_REQUEST)

    # Fallback to DRF's default exception handler
    response = drf_exception_handler(exc, context)
    return response
