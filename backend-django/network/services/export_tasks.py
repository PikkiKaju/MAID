from celery import shared_task
from network.models import TrainingJob
from network.services.model_export import export_model_to_tflite
import os

@shared_task(bind=True, name="network.run_model_export")
def run_model_export(self, job_id, format_type):
    try:
        job = TrainingJob.objects.get(id=job_id)
        # Ensure artifact_path is present
        if not job.artifact_path:
            print(f"Model artifact not found for job {job_id}")
            return

        # Prepare temporary files for conversion
        import tempfile, shutil

        tmp_in = None
        tmp_out = None
        try:
            # If artifact_path points to a local filesystem path, prefer using it directly
            if os.path.isabs(job.artifact_path) and os.path.exists(job.artifact_path):
                tmp_in = job.artifact_path
            else:
                # Try to open via storage backend and copy to a temp file
                stream = None
                try:
                    from network import storage
                    stream = storage.open_stream(job.artifact_path)
                except Exception:
                    stream = None
                if stream is None:
                    # Could not open artifact
                    print(f"Could not open artifact stream for job {job_id}: {job.artifact_path}")
                    return
                tmpf = tempfile.NamedTemporaryFile(delete=False, suffix=".keras")
                try:
                    shutil.copyfileobj(stream, tmpf)
                    tmp_in = tmpf.name
                finally:
                    try:
                        tmpf.close()
                    except Exception:
                        pass
                    try:
                        stream.close()
                    except Exception:
                        pass

            base_dir = os.path.dirname(tmp_in) if tmp_in and os.path.isabs(tmp_in) else None
            output_filename = f"model.{format_type}"
            # If tmp_in is local path, put tmp_out next to it; else use temp file
            if base_dir:
                tmp_out = os.path.join(base_dir, output_filename)
            else:
                tmp_out = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format_type}").name

            if format_type == 'tflite':
                export_model_to_tflite(tmp_in, tmp_out)
            else:
                print(f"Requested export format '{format_type}' is not supported (only 'tflite').")
                return

            # Save output back to storage under artifacts/<job.id>_export.<ext>
            key = f"artifacts/{job.id}.{format_type}"
            with open(tmp_out, 'rb') as fh:
                from network import storage

                saved = storage.save_file(key, fh)

            # Update job.result to indicate availability
            result = job.result or {}
            exports = result.get('exports', [])
            if format_type not in exports:
                exports.append(format_type)
                result['exports'] = exports
                job.result = result
                job.save(update_fields=['result'])

        finally:
            # Cleanup temporary files if we created them
            try:
                if tmp_in and tmp_in.endswith('.keras') and os.path.exists(tmp_in) and not os.path.isabs(job.artifact_path):
                    os.remove(tmp_in)
            except Exception:
                pass
            try:
                if tmp_out and os.path.exists(tmp_out) and (not base_dir or not tmp_out.startswith(base_dir)):
                    os.remove(tmp_out)
            except Exception:
                pass

    except Exception as e:
        print(f"Export failed: {e}")
        # In a real app, we might want to store this error in the job status or a separate 'export_status' field
