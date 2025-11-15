from __future__ import annotations

from django.test import override_settings
from rest_framework.test import APITestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model

from network.models import ModelImportJob, ImportJobStatus


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class ImportJobsTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="testpass")
        self.client.force_authenticate(user=self.user)

    def test_create_and_process_import_job(self):
        # Patch the heavy loader before creating the job so eager Celery runs
        import network.services.import_jobs as import_jobs

        def _stub_loader(path: str):
            return {
                "name": "imported",
                "task": "",
                "framework": "tf-keras",
                "framework_version": "",
                "description": "",
                "metadata": {},
                "nodes": [],
                "edges": [],
            }

        import_jobs.load_graph_from_keras_artifact = _stub_loader

        url = reverse("model-import-job-list")
        f = SimpleUploadedFile("model.keras", b"{}", content_type="application/json")
        resp = self.client.post(url, {"file": f}, format="multipart")
        self.assertEqual(resp.status_code, 202)
        job_id = resp.data.get("id")
        self.assertIsNotNone(job_id)

        # The eager task has already been executed; validate results
        job = ModelImportJob.objects.get(id=job_id)
        self.assertEqual(job.status, ImportJobStatus.SUCCEEDED)
        self.assertTrue(job.graph_payload)

    def test_cancel_import_job(self):
        # Prevent eager processing so the job remains queued and cancellable
        import network.services.import_jobs as import_jobs
        _orig_delay = getattr(import_jobs.process_model_import_job, "delay", None)
        import_jobs.process_model_import_job.delay = lambda *a, **k: None

        url = reverse("model-import-job-list")
        f = SimpleUploadedFile("model.keras", b"{}", content_type="application/json")
        resp = self.client.post(url, {"file": f}, format="multipart")
        self.assertEqual(resp.status_code, 202)
        job_id = resp.data.get("id")

        cancel_url = reverse("model-import-job-cancel", kwargs={"pk": job_id})
        resp2 = self.client.post(cancel_url)
        self.assertIn(resp2.status_code, (200, 202))

        job = ModelImportJob.objects.get(id=job_id)
        self.assertEqual(job.status, ImportJobStatus.CANCELLED)
        # restore original delay implementation
        if _orig_delay is not None:
            import_jobs.process_model_import_job.delay = _orig_delay

    def test_pending_limit(self):
        url = reverse("model-import-job-list")
        # temporarily lower user's pending limit and prevent processing so jobs remain queued
        import network.services.import_jobs as import_jobs
        _orig_delay = getattr(import_jobs.process_model_import_job, "delay", None)
        import_jobs.process_model_import_job.delay = lambda *a, **k: None
        with self.settings(IMPORT_JOB_MAX_PENDING_PER_USER=1):
            f1 = SimpleUploadedFile("a.keras", b"{}", content_type="application/json")
            resp1 = self.client.post(url, {"file": f1}, format="multipart")
            self.assertEqual(resp1.status_code, 202)

            f2 = SimpleUploadedFile("b.keras", b"{}", content_type="application/json")
            resp2 = self.client.post(url, {"file": f2}, format="multipart")
            self.assertEqual(resp2.status_code, 429)
        if _orig_delay is not None:
            import_jobs.process_model_import_job.delay = _orig_delay
