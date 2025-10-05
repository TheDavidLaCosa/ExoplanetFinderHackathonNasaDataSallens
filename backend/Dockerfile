FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend_features.py ./backend_features.py
RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["gunicorn", "-w", "2", "--threads", "4", "-b", "0.0.0.0:4000", "backend_features:app"]
