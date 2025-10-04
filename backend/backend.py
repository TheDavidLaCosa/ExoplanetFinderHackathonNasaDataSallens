from flask import Flask, jsonify, send_file

app = Flask(__name__)

# Data endpoint
@app.route('/api/data', methods=['GET'])
def get_data():

    data = {
        "message": "Data",
        "status": "success",
        "items": [
            {"id": 1, "name": "Name1"},
            {"id": 2, "name": "Name2"},
            {"id": 3, "name": "Name3"}
        ]
    }
    # Retornem la resposta com a JSON
    return jsonify(data)

@app.route('/api/image', methods=['GET'])
def get_image(name: str = ""):
    return send_file("nasa-october-2025-4k-3840x2160-1.webp", mimetype="image/webp")

# Main
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
