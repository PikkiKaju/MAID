FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings
ENV NETWORK_GENERATE_TF_MANIFESTS=true
ENV POSTGRES_PORT=5432

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && python manage.py loadmanifests && python manage.py runserver 0.0.0.0:8000"]
