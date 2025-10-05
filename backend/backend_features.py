from flask import Flask, request, render_template_string, redirect, url_for
import pandas as pd
import io, uuid, os
from nasa_ import *

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 120 * 1024 * 1024  # 120MB

# In-memory store dels uploads (bytes)
UPLOAD_STORE: dict[str, bytes] = {}
# Map d'upload_id -> path del CSV net guardat
CLEANED_CSV_PATHS: dict[str, str] = {}

UPLOAD_DIR = "./uploads"

# ---------------------------
# Plantilles HTML (inline)
# ---------------------------

TPL_UPLOAD = """
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <title>Pujar Excel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Arial, sans-serif; margin:2rem;}
    .card{border:1px solid #ddd; border-radius:10px; padding:1rem; max-width:600px;}
    .actions{margin-top:1rem;}
    input[type=file]{padding:.4rem;}
    button{padding:.5rem .9rem; border:1px solid #333; background:#f6f6f6; border-radius:8px; cursor:pointer;}
  </style>
</head>
<body>
  <h1>Pujar fitxer Excel/CSV</h1>
  <div class="card">
    <form action="{{ url_for('handle_excel') }}" method="post" enctype="multipart/form-data">
      <label for="file">Selecciona un fitxer (.xlsx, .xls o .csv):</label><br><br>
      <input id="file" name="file" type="file" accept=".xlsx,.xls,.csv" required>
      <div class="actions">
        <button type="submit">Pujar i veure columnes</button>
      </div>
    </form>
  </div>
</body>
</html>
"""

TPL_COLUMNS = """
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <title>Seleccionar columnes</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Arial, sans-serif; margin:2rem;}
    .grid{display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:.6rem;}
    .item{border:1px solid #ddd; border-radius:10px; padding:.6rem; display:flex; align-items:center; gap:.6rem;}
    .meta{margin:.5rem 0 1rem; color:#555;}
    .actions{margin-top:1rem;}
    button{padding:.6rem 1rem; border:1px solid #333; background:#f6f6f6; border-radius:8px; cursor:pointer;}
    .filename{font-weight:bold;}
    .path{font-family:monospace; color:#444;}
  </style>
</head>
<body>
  <h1>Columnes detectades</h1>
  <p class="meta">
    Fitxer: <span class="filename">{{ filename }}</span> · Columnes trobades: <strong>{{ columns|length }}</strong><br>
    CSV net desat a: <span class="path">{{ cleaned_path or "(no disponible)" }}</span>
  </p>

  {% if error %}
    <p style="color:#b00">{{ error }}</p>
  {% endif %}

  {% if columns and columns|length > 0 %}
  <form action="{{ url_for('submit_columns') }}" method="post">
    <!-- IDs ocults per recuperar el fitxer en memòria -->
    <input type="hidden" name="filename" value="{{ filename|e }}">
    <input type="hidden" name="upload_id" value="{{ upload_id|e }}">
    <div class="grid">
      {% for col in columns %}
        <label class="item">
          <input type="checkbox" name="selected_columns" value="{{ col }}" checked>
          <span>{{ col }}</span>
        </label>
      {% endfor %}
    </div>
    <div class="actions">
      <button type="submit">Enviar selecció</button>
    </div>
  </form>
  {% else %}
    <p>No s'han detectat columnes.</p>
  {% endif %}
</body>
</html>
"""

TPL_RESULT = """
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <title>Resultat selecció</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Arial, sans-serif; margin:2rem;}
    .pill{display:inline-block; padding:.3rem .6rem; margin:.2rem; border:1px solid #bbb; border-radius:999px; background:#fafafa;}
    .meta{color:#555;}
    a.button{display:inline-block; margin-top:1rem; padding:.5rem .9rem; border:1px solid #333; background:#f6f6f6; border-radius:8px; text-decoration:none; color:#000;}
  </style>
</head>
<body>
  <h1>Columnes seleccionades</h1>
  <p class="meta">Fitxer: <strong>{{ filename }}</strong></p>
  {% if selected and selected|length > 0 %}
    {% for c in selected %}
      <span class="pill">{{ c }}</span>
    {% endfor %}
  {% else %}
    <p>No has seleccionat cap columna.</p>
  {% endif %}
  <div>
    <a class="button" href="{{ url_for('upload_excel') }}">Tornar a pujar un altre fitxer</a>
  </div>
</body>
</html>
"""

# ---------------------------
# Helpers
# ---------------------------

def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def read_columns_and_save_clean_csv(filename: str, content: bytes) -> tuple[list[str], str]:
    """
    Llegeix TOT el fitxer (taula en memòria) i desa un CSV net (sense línies amb '#').
    Retorna (columns, cleaned_csv_path).

    - CSV: sep="," i comment="#"
    - Excel: es converteix a CSV (sep=",") per uniformitat
    """
    lower = (filename or "").lower()
    _ensure_upload_dir()
    cleaned_path = os.path.join(UPLOAD_DIR, f"dataset.csv")

    if lower.endswith(".csv"):
        # Llegeix tot el CSV ja netejant metadades amb '#'
        df = pd.read_csv(
            io.BytesIO(content),
            sep=",",
            comment="#",
            engine="python",
            on_bad_lines="skip"
        )
        # Desa CSV net
        df.to_csv(cleaned_path, index=False)
        return list(df.columns), cleaned_path

    elif lower.endswith(".xlsx") or lower.endswith(".xls"):
        # Excel: llegeix tot i desa en format CSV per consistència
        df = pd.read_excel(io.BytesIO(content))
        df.to_csv(cleaned_path, index=False)
        return list(df.columns), cleaned_path

    else:
        raise ValueError("Format no suportat. Fes servir .xlsx, .xls o .csv")

# ---------------------------
# Rutes
# ---------------------------

@app.route("/excel", methods=["GET"])
def upload_excel():
    """Mostra el formulari per pujar el fitxer."""
    return render_template_string(TPL_UPLOAD)

@app.route("/excel", methods=["POST"])
def handle_excel():
    """
    Rep el fitxer, el desa en memòria, llegeix tota la taula netejant '#'
    i desa un CSV net a ./uploads/{upload_id}_clean.csv. Mostra columnes.
    """
    file = request.files.get("file")
    if not file or file.filename == "":
        return render_template_string(
            TPL_COLUMNS,
            filename="(sense nom)",
            columns=[],
            error="No s'ha rebut cap fitxer.",
            upload_id="",
            cleaned_path=""
        )

    try:
        content = file.read()  # bytes del fitxer
        upload_id = str(uuid.uuid4())
        UPLOAD_STORE[upload_id] = content

        columns, cleaned_path = read_columns_and_save_clean_csv(file.filename, content)
        data, data_pac, model= process_data(columns, level=20)
        CLEANED_CSV_PATHS[upload_id] = cleaned_path

        return render_template_string(
            TPL_COLUMNS,
            filename=file.filename,
            columns=columns,
            error=None,
            upload_id=upload_id,
            cleaned_path=cleaned_path
        )
    except Exception as e:
        return render_template_string(
            TPL_COLUMNS,
            filename=getattr(file, "filename", "(sense nom)"),
            columns=[],
            error=f"Error en llegir/guardar el fitxer: {e}",
            upload_id="",
            cleaned_path=""
        )

@app.route("/excel/submit", methods=["POST"])
def submit_columns():
    """
    Rep les columnes seleccionades. Si cal continuar el processament,
    pots reobrir el CSV net amb CLEANED_CSV_PATHS[upload_id].
    """
    filename = request.form.get("filename", "(sense nom)")
    selected = request.form.getlist("selected_columns")
    upload_id = request.form.get("upload_id", "")

    cleaned_path = CLEANED_CSV_PATHS.get(upload_id, "")
    # Exemple: llegir el CSV net i filtrar columnes seleccionades
    # if cleaned_path and os.path.exists(cleaned_path):
    #     df = pd.read_csv(cleaned_path)
    #     if selected:
    #         df = df[selected]
    #     # ... processar df o desar una nova sortida ...

    return render_template_string(TPL_RESULT, filename=filename, selected=selected)

# ---------------------------
# Main
# ---------------------------
if __name__ == "__main__":
    _ensure_upload_dir()
    app.run(host="0.0.0.0", port=4000, debug=True)
