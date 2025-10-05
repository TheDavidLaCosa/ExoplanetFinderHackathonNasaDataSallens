FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=UTF-8

# Utilitats (curl per healthchecks). Afegeix libgomp1 si uses xgboost.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libgomp1 fonts-dejavu \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instal·la dependències abans de copiar el codi per aprofitar la caché
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 👉 Copia TOTS els fitxers de la carpeta backend al container
# (assegura’t de fer el build amb context ./backend des del docker-compose)
COPY . /app

# Carpetes d’output
RUN mkdir -p /app/uploads /app/img

EXPOSE 4000

# Si canvies el fitxer principal, només cal canviar aquest mòdul
ENV APP_MODULE=backend_features:app \
    WORKERS=2 \
    THREADS=4 \
    TIMEOUT=120

CMD ["bash", "-lc", "gunicorn -w ${WORKERS} -k gthread --threads ${THREADS} --timeout ${TIMEOUT} -b 0.0.0.0:4000 ${APP_MODULE}"]
