import json
from django.urls import reverse
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from network.models import NetworkGraph

from django.contrib.auth import get_user_model


class TrainCSVHeaderValidationTests(APITestCase):
    def test_rejects_missing_x_columns_in_uploaded_csv(self):
        # Create a minimal graph
        g = NetworkGraph.objects.create(name="test-graph")

        # Create and authenticate a test user because the view requires IsAuthenticated
        User = get_user_model()
        user = User.objects.create_user(username="tester", password="pw")
        self.client.force_authenticate(user=user)

        url = reverse("network-graph-train", args=[str(g.id)])

        # CSV has header with only 'a' and 'c' but x_columns declares 'a' and 'b'
        csv_content = b"a,c\n1,2\n"
        uploaded = SimpleUploadedFile("dataset.csv", csv_content, content_type="text/csv")

        data = {
            "x_columns": json.dumps(["a", "b"]),
            "y_column": "c",
            "file": uploaded,
        }

        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, 400)
        # Some client/test setups may not populate response.data for multipart responses;
        # fall back to checking raw content if needed.
        detail_text = ""
        try:
            if isinstance(response.data, dict):
                detail_text = response.data.get("detail", "") or ""
        except Exception:
            detail_text = ""
        if not detail_text:
            try:
                detail_text = response.content.decode("utf-8", errors="ignore")
            except Exception:
                detail_text = ""

        self.assertIn("missing required columns", detail_text.lower())

    def test_requires_authentication(self):
        # Ensure endpoint rejects unauthenticated requests
        g = NetworkGraph.objects.create(name="test-graph-2")
        url = reverse("network-graph-train", args=[str(g.id)])
        csv_content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("dataset.csv", csv_content, content_type="text/csv")
        data = {
            "x_columns": json.dumps(["a"]),
            "y_column": "b",
            "file": uploaded,
        }
        # Do not authenticate
        self.client.force_authenticate(user=None)
        response = self.client.post(url, data, format='multipart')
        self.assertIn(response.status_code, (401, 403))
