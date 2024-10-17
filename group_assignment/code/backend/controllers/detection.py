import uuid
import gc
import os
import time
import base64
import tempfile
import threading
import asyncio
import logging
from flask_socketio import SocketIO
from dotenv import load_dotenv
from services import DetectionService, Manager
from flask_socketio import emit, join_room
from flask import Blueprint, request, jsonify, Response
from functools import wraps
from models import GlobalSettings

detection_controller = Blueprint('detection_controller', __name__)

CACHE_DIR = 'cache'
os.makedirs(CACHE_DIR, exist_ok=True)

MODELS_FOLDER =  '/Users/anhdang/Documents/Github/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/models'

def create_detection_controller(socketio):
    
    # Intialize Manager
    model_manager = Manager(models_folder=MODELS_FOLDER)
    
    # Load all available model
    available_yolo_models = model_manager.list_yolo_models()
    available_fastsam_models = model_manager.list_fastsam_models()
    
    def intialize_detection_service():
        global_settings = GlobalSettings.get_settings()
        if not global_settings:
            raise ValueError("Global Settings Not Found")
        
        detection_service = DetectionService(
            yolo_model = available_yolo_models[global_settings.detection_model_name],
            segmentation_model = available_fastsam_models[global_settings.segmentation_model_name],
            socketio = socketio,
        )
        
        detection_controller.detection_service = detection_service
        
    @detection_controller.route('/list_models', methods=['GET'])
    def list_models():
        """
        Endpoint to list all available detection and segmentation models.
        """
        return jsonify({
            'detection_models': list(available_yolo_models.keys()),
            'segmentation_models': list(available_fastsam_models.keys())
        }), 200
        
    @detection_controller.route('/get_model_type', methods=['GET'])
    def get_model_type():
        """
        Endpoint to list all available model types.
        """
        model_types = model_manager.get_model_type()
        return jsonify({'model_types': model_types}), 200
    
    @detection_controller.route('/set_models', methods=['POST'])
    def set_models():
        """
        Endpoint to set detection and segmentation models along with target class IDs.
        """
        try:
            # Parse JSON body instead of query parameters
            data = request.json
            detection_model_name = data.get('yolo')
            segmentation_model_name = data.get('fastsam')

            if not detection_model_name or not segmentation_model_name:
                raise ValueError('Detection and segmentation models must be specified.')

            detection_model = available_yolo_models.get(detection_model_name)
            segmentation_model = available_fastsam_models.get(segmentation_model_name)

            if not detection_model or not segmentation_model:
                raise ValueError('Invalid detection or segmentation model name.')
            
            # Update global settings in the database
            GlobalSettings.update_settings(
                detection_model_name=detection_model_name,
                segmentation_model_name=segmentation_model_name,
            )
            
            global_settings = GlobalSettings.get_settings()
            detection_service = DetectionService(
                yolo_model = available_yolo_models[global_settings.detection_model_name],
                segmentation_model = available_fastsam_models[global_settings.segmentation_model_name],
                socketio = socketio,
            )
            
            detection_controller.detection_service = detection_service
            return jsonify({"message": "Models and target classes set successfully"}), 200
    
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            print(f'Unexpected error during model setup: {str(e)}')
            return jsonify({'error': 'An unexpected error occurred during model setup'}), 500
        
    @detection_controller.route('/upload', methods=['POST'])
    def upload_file():
        """
        Endpoint to upload a file (image or video).
        """
        try:
            source, is_image = _get_source(request)
            file_key = str(uuid.uuid4())  # Generate a unique key for this file
            
            # Save the file to the cache directory
            cache_file_path = os.path.join(CACHE_DIR, file_key)
            with open(cache_file_path, 'wb') as cache_file:
                cache_file.write(source)
            
            return jsonify({"file_key": file_key}), 200
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except UnsupportedMediaTypeError as e:
            return jsonify({'error': str(e)}), 415
        except Exception as e:
            print(f'Unexpected error during upload: {str(e)}')
            return jsonify({'error': 'An unexpected error occurred during upload'}), 500
    
    def _get_source(req):
        """
        Helper function to extract video or image source from the request.
        Raises ValueError for bad requests and UnsupportedMediaTypeError for unsupported media types.
        """
        content_type = req.headers.get('Content-Type')

        if content_type and 'multipart/form-data' in content_type:
            if 'video_source' in req.files:
                source_file = req.files['video_source']
                if source_file and source_file.filename != '':
                    if source_file.mimetype.startswith('video/'):
                        return source_file.read(), False  # is_image=False
                    elif source_file.mimetype.startswith('image/'):
                        return source_file.read(), True  # is_image=True
                    else:
                        raise UnsupportedMediaTypeError('Unsupported media type')
                else:
                    raise ValueError('No file selected or empty file')

            elif 'video_source' in req.form:
                return req.form['video_source'], False  # Assuming URL or file path, not bytes, not image

        if content_type == 'application/json':
            if req.json and 'video_source' in req.json:
                return req.json['video_source'], False  # Assuming URL or file path, not bytes, not image

        if 'webcam' in req.form or (req.json and 'webcam' in req.json):
            return 0, False  # Webcam source

        raise ValueError('No valid video or image source provided')

    class UnsupportedMediaTypeError(Exception):
        """Custom exception for unsupported media types"""
        pass
    
    @detection_controller.route('/start_process', methods=['POST'])
    def start_process():
        """
        Endpoint to start the detection and segmentation process.
        """
        try:
            data = request.json
            file_key = data.get('file_key')
            if not file_key:
                raise ValueError('Invalid or missing file key.')

            # Access the file from the cache directory
            cache_file_path = os.path.join(CACHE_DIR, file_key)
            if not os.path.exists(cache_file_path):
                raise ValueError('File not found in cache.')

            # Read the file directly from disk
            with open(cache_file_path, 'rb') as file:
                file_buffer = file.read()

            is_image = data.get('is_image', False)

            if detection_controller.detection_service is None:
                intialize_detection_service()

            detection_controller.detection_service.start_processing(file_buffer, is_image=is_image, file_key=file_key)

            # Remove the cached file after starting processing to free up space
            os.remove(cache_file_path)

            return jsonify({"message": "Processing started"}), 200
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            print(f'Unexpected error during processing start: {str(e)}')
            return jsonify({'error': 'An unexpected error occurred during processing start'}), 500
    
    @socketio.on('join')
    def on_join(data):
        file_key = data['file_key']
        join_room(file_key)
        print(f"Client joined room: {file_key}")

    return detection_controller
