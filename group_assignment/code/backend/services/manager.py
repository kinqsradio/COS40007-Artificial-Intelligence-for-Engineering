import logging
import time
import base64
import os
from models import YoloModel
from flask_socketio import SocketIO
from flask import url_for

class Manager:
    def __init__(self, models_folder, socketio: SocketIO):
        self.models_folder = models_folder
        self.models = {
            'yolo': {}
        }
        self.socketio = socketio

    def list_yolo_models(self):
        """
        Lists YOLO models from the 'weights' sub-folder of each training directory.
        The structure is expected to be:
        models_folder/
            ├── <training_folder>/
            │   └── weights/
            │       ├── best.pt
            │       └── last.pt
        """
        # Clear the existing models dictionary
        self.models['yolo'].clear()

        # Traverse each subdirectory in the models folder
        for training_folder in os.listdir(self.models_folder):
            training_path = os.path.join(self.models_folder, training_folder)
            weights_path = os.path.join(training_path, 'weights')

            # Check if the weights path exists and is a directory
            if not os.path.isdir(weights_path):
                continue

            # List all .pt files in the weights directory
            for file_name in os.listdir(weights_path):
                if file_name.endswith('.pt'):
                    model_path = os.path.join(weights_path, file_name)
                    model_instance = YoloModel(model_path)
                    model_name = f"{training_folder}/{file_name}"
                    self.models['yolo'][model_name] = model_instance

        return self.models['yolo']


    def emit_training_results(self, training_folder):
        """
        Emits training results from the specified training folder.
        The results include various training output files like plots and logs.
        """
        training_path = os.path.join(self.models_folder, training_folder)

        if not os.path.isdir(training_path):
            logging.error(f"Training folder {training_folder} does not exist.")
            return

        # Collect training results
        results = {}
        for file_name in os.listdir(training_path):
            file_path = os.path.join(training_path, file_name)
            if file_name.endswith(('.png', '.jpg', '.csv', '.yaml', '.txt')) or 'events' in file_name:
                try:
                    if file_name.endswith(('.png', '.jpg')):
                        # Encode image as base64
                        with open(file_path, 'rb') as image_file:
                            encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
                        results[file_name] = {'type': 'image', 'data': encoded_image}
                    elif file_name.endswith(('.csv', '.yaml', '.txt')):
                        # Read text-based files
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as text_file:
                            file_content = text_file.read()
                        results[file_name] = {'type': 'text', 'data': file_content}
                except Exception as e:
                    logging.error(f"Failed to read file {file_name}: {e}")
                    continue

        # Emit the collected results to the room for the specified training folder
        self.socketio.emit('training_results', {'training_folder': training_folder, 'results': results}, room=training_folder)
        logging.info(f"Emitted training results for {training_folder} to the room.")


