from django.test import SimpleTestCase

from network.serializers import TrainingStartSerializer


class TrainingStartSerializerTests(SimpleTestCase):
    def test_rejects_overlapping_splits(self):
        data = {
            "x_columns": ["x1", "x2"],
            "y_column": "y",
            "validation_split": 0.8,
            "test_split": 0.3,
        }
        s = TrainingStartSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("validation_split", s.errors)
        self.assertIn("test_split", s.errors)

    def test_accepts_json_string_lists(self):
        data = {
            "x_columns": '["x1", "x2"]',
            "y_column": "y",
            "epochs": "5",
        }
        s = TrainingStartSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["x_columns"], ["x1", "x2"]) 
        # numeric string should be coerced by serializer
        self.assertEqual(s.validated_data["epochs"], 5)
