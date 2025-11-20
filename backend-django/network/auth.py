from typing import ClassVar, Iterable

from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTStatelessUserAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings


class ASPNetJWTAuthentication(JWTStatelessUserAuthentication):
    """Allow ASP.NET-issued JWTs by mapping their claim names to SimpleJWT's expectations."""

    USER_ID_CLAIM_CANDIDATES: ClassVar[Iterable[str]] = (
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        "nameid",
        "sub",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "unique_name",
    )

    FALLBACK_USERNAME_CLAIMS: ClassVar[Iterable[str]] = (
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "unique_name",
        "name",
    )

    def get_user(self, validated_token):
        user_id = self._extract_claim(validated_token, self.USER_ID_CLAIM_CANDIDATES)
        if not user_id:
            raise InvalidToken({"detail": _("Token contained no recognizable user identification")})

        validated_token[api_settings.USER_ID_CLAIM] = str(user_id)

        if "username" not in validated_token:
            username_claim = self._extract_claim(validated_token, self.FALLBACK_USERNAME_CLAIMS)
            if username_claim:
                validated_token["username"] = str(username_claim)

        return super().get_user(validated_token)

    @staticmethod
    def _extract_claim(token, candidates: Iterable[str]):
        for claim in candidates:
            if claim in token and token[claim]:
                return token[claim]
        return None
