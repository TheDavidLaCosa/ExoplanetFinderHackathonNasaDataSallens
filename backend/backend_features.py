from flask import Flask, request, render_template_string, redirect, url_for
import pandas as pd
import io

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 120 * 1024 * 1024  # 120MB, ajusta si cal

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

def _detect_delimiter(lines: list[str]) -> str:
    """
    Intenta detectar el delimitador dominant entre ',', ';', '\\t', '|'
    mirant la distribució de comptatges per línia (q3).
    """
    candidates = [',', ';', '\t', '|']
    scores = {}
    for d in candidates:
        counts = [l.count(d) for l in lines if l.strip()]
        if not counts:
            scores[d] = 0
        else:
            counts_sorted = sorted(counts)
            q3 = counts_sorted[int(0.75 * (len(counts_sorted)-1))]
            scores[d] = q3
    delim = max(scores, key=scores.get)
    return delim if scores[delim] > 0 else ','

def _is_plausible_header(line: str, delim: str) -> bool:
    """
    Capçalera plausible: >=2 camps, camps no buits, i prou lletres.
    """
    parts = [p.strip() for p in line.split(delim)]
    if len(parts) < 2:
        return False
    if sum(1 for p in parts if p) < 2:
        return False
    letters = sum(c.isalpha() for c in line)
    ratio = letters / max(len(line), 1)
    return ratio > 0.15

def _count_fields(line: str, delim: str) -> int:
    return len(line.split(delim))

def _find_last_table_start(lines: list[str], delim: str):
    """
    Retorna l'índex d'inici de l'ÚLTIM bloc taula detectat.
    Heurística: línia capçalera plausible + almenys 2 línies següents
    amb el mateix # de camps (ignorant línies buides).
    """
    starts = []
    n = len(lines)
    for i in range(n):
        line = lines[i]
        if not line.strip():
            continue
        if not _is_plausible_header(line, delim):
            continue
        header_fields = _count_fields(line, delim)
        lookahead = lines[i+1:i+6]
        same = 0
        for la in lookahead:
            if not la.strip():
                continue
            if _count_fields(la, delim) == header_fields:
                same += 1
        if same >= 2:
            starts.append(i)
    if not starts:
        return None
    return starts[-1]

def read_columns_from_upload(file_storage) -> list[str]:
    """
    Llegeix les columnes d'un Excel/CSV des d'un FileStorage (sense guardar a disc).
    - CSV: ignora qualsevol línia que comenci per '#', autodetecta el separador i només llegeix l'header.
    - Excel: llegeix normalment.
    """
    import io
    import pandas as pd

    filename = (file_storage.filename or "").lower()
    content = file_storage.read()  # bytes

    if filename.endswith(".csv"):
        # Només llegim l'header (nrows=0) i ignorem línies que comencin per '#'
        # sep=None + engine='python' -> autodetecció de separador (coma, punt i coma, tab, etc.)
        df = pd.read_csv(
            io.BytesIO(content),
            nrows=0,
            comment="#",
            sep=None,
            engine="python",
            on_bad_lines="skip"
        )
        return list(df.columns)

    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        # Excel: lectura directa. (Si algun dia tens files “metadata” amb '#',
        # caldria una lògica específica per detectar l'header dins del full).
        df = pd.read_excel(io.BytesIO(content))
        return list(df.columns)

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
    """Rep el fitxer, llegeix les columnes i mostra el formulari amb les checkboxes."""
    file = request.files.get("file")
    if not file or file.filename == "":
        return render_template_string(
            TPL_COLUMNS,
            filename="(sense nom)",
            columns=[],
            error="No s'ha ricevut cap fitxer."
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
    selected = request.form.getlist("selected_columns")
    print(f"Selected: {selected}")
    return render_template_string(TPL_RESULT, filename=filename, selected=selected)

# ---------------------------
# Main
# ---------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
