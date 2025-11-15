import json
from django.urls import reverse
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from network.models import NetworkGraph


class TrainCSVHeaderValidationTests(APITestCase):
    def test_rejects_missing_x_columns_in_uploaded_csv(self):
        # Create a minimal graph
        g = NetworkGraph.objects.create(name="test-graph")

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
        self.assertIn("missing required columns", response.data.get("detail", "").lower())
