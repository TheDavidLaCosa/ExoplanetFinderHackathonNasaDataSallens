import base64
from flask import Flask, jsonify, send_file
from nasa_ import *

app = Flask(__name__)

@app.route('/', methods=['GET'])
def get_main():
    return "Hello"

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

def image_to_base64(path):
    with open(path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

@app.route('/api/multi', methods=['GET'])
def get_multiple_images():
    # Llista d’imatges locals
    images = ["example1.jpg", "example2.jpg", "example3.jpg"]

    # Codifiquem cada imatge
    encoded_images = [image_to_base64(img) for img in images]

    # Retornem JSON amb text + imatges
    response = {
        "status": "success",
        "message": "Tres imatges enviades correctament!",
        "count": len(encoded_images),
        "images": encoded_images
    }
    return jsonify(response)

# Main
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
