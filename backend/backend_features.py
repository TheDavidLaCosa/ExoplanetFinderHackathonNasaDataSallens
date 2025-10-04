from flask import Flask, request, render_template_string, redirect, url_for
import pandas as pd
import io

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20MB, ajusta si cal

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
  </style>
</head>
<body>
  <h1>Columnes detectades</h1>
  <p class="meta">Fitxer: <span class="filename">{{ filename }}</span> · Columnes trobades: <strong>{{ columns|length }}</strong></p>

  {% if error %}
    <p style="color:#b00">{{ error }}</p>
  {% endif %}

  {% if columns and columns|length > 0 %}
  <form action="{{ url_for('submit_columns') }}" method="post">
    <!-- Reenviem el nom de fitxer només informatiu (opcional) -->
    <input type="hidden" name="filename" value="{{ filename|e }}">
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

def read_columns_from_upload(file_storage) -> list[str]:
    """
    Llegeix les columnes d'un Excel/CSV des d'un FileStorage (sense guardar a disc).
    Retorna una llista de noms de columna (strings).
    """
    filename = file_storage.filename or ""
    content = file_storage.read()  # bytes
    buf = io.BytesIO(content)

    # Decideix com llegir segons extensió
    lower = filename.lower()
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        df = pd.read_excel(buf)  # cal 'openpyxl' per .xlsx
    elif lower.endswith(".csv"):
        df = pd.read_csv(buf)
    else:
        raise ValueError("Format no suportat. Fes servir .xlsx, .xls o .csv")

    # Assegurar-nos que df té columnes
    if df is None or df.empty:
        # Si el fitxer no tenia dades, igualment df.columns pot tenir noms;
        # però si està totalment buit, retorna llista buida.
        return list(df.columns) if df is not None else []

    return list(df.columns)

# ---------------------------
# Rutes
# ---------------------------

@app.route("/excel", methods=["GET"])
def upload_excel():
    """Mostra el formulari per pujar el fitxer."""
    return render_template_string(TPL_UPLOAD)

@app.route("/excel", methods=["POST"])
def handle_excel():
    """Rep el fitxer, llegeix les columnes i mostra el formulari amb les checkboxes."""
    file = request.files.get("file")
    if not file or file.filename == "":
        # Torna a la vista amb error
        return render_template_string(
            TPL_COLUMNS,
            filename="(sense nom)",
            columns=[],
            error="No s'ha rebut cap fitxer."
        )

    try:
        columns = read_columns_from_upload(file)
        return render_template_string(
            TPL_COLUMNS,
            filename=file.filename,
            columns=columns,
            error=None
        )
    except Exception as e:
        return render_template_string(
            TPL_COLUMNS,
            filename=file.filename,
            columns=[],
            error=f"Error en llegir el fitxer: {e}"
        )

@app.route("/excel/submit", methods=["POST"])
def submit_columns():
    """Rep les columnes seleccionades i mostra un resultat (o continua el teu flux)."""
    filename = request.form.get("filename", "(sense nom)")
    selected = request.form.getlist("selected_columns")  # llista de valors seleccionats
    # Aquí pots guardar la selecció, redirigir, o seguir amb el teu processament.
    return render_template_string(TPL_RESULT, filename=filename, selected=selected)

# ---------------------------
# Main
# ---------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
