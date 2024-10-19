import uuid
import gc
import os
import logging
from flask_socketio import SocketIO
from services import DetectionService, Manager
from flask_socketio import emit, join_room
from flask import Blueprint, request, jsonify
from threading import Lock
from flask import send_from_directory, jsonify


detection_controller = Blueprint('detection_controller', __name__)

CACHE_DIR = 'cache'
os.makedirs(CACHE_DIR, exist_ok=True)

MODELS_FOLDER = 'group_assignment/runs/train'

def create_detection_controller(socketio):
    
    detection_controller.detection_service = None
    
    # Initialize Manager
    model_manager = Manager(models_folder=MODELS_FOLDER, socketio=socketio)
    
    # Load all available models
    available_yolo_models = model_manager.list_yolo_models()
    
    # Lock for thread safety
    service_lock = Lock()

    def initialize_detection_service(model_name):
        """
        Initializes the detection service based on the specified model.
        """
        if model_name not in available_yolo_models:
            raise ValueError("Invalid model name provided")

        # Create the detection service with the selected model
        detection_service = DetectionService(
            yolo_model=available_yolo_models[model_name],
            socketio=socketio,
        )
        detection_controller.detection_service = detection_service

    def clear_detection_service():
        """
        Clears the existing detection service and frees resources.
        """
        with service_lock:
            if hasattr(detection_controller, 'detection_service') and detection_controller.detection_service:
                detection_controller.detection_service.clear_resources()
                del detection_controller.detection_service
                detection_controller.detection_service = None
                # Clear GPU memory if applicable
                try:
                    import torch
                    torch.cuda.empty_cache()
                except ImportError:
                    pass
                gc.collect()

    @detection_controller.route('/list_models', methods=['GET'])
    def list_models():
        """Endpoint to list all available detection models."""
        return jsonify({'detection_models': list(available_yolo_models.keys())}), 200

    @detection_controller.route('/set_model', methods=['POST'])
    def set_model():
        """
        Endpoint to set the detection model without emitting training results.
        """
        try:
            data = request.json
            detection_model_name = data.get('yolo')

            if not detection_model_name:
                raise ValueError('Detection model must be specified.')

            # Clear the previous detection service and initialize the new one
            clear_detection_service()
            initialize_detection_service(detection_model_name)

            return jsonify({"message": "Model set successfully"}), 200

        except ValueError as e:
            logging.error(f"Model setup error: {str(e)}")
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            logging.exception("Unexpected error during model setup")
            return jsonify({'error': 'An unexpected error occurred during model setup'}), 500

    @socketio.on('request_training_results')
    def handle_request_training_results(data):
        """
        Handles the 'request_training_results' socket event.
        Emits the training results for the specified training folder.
        """
        training_folder = data.get('training_folder')
        
        if not training_folder:
            logging.error("Training folder not specified in request.")
            return

        # Join a room specific to the training folder for targeted communication
        join_room(training_folder)
        logging.info(f"Client joined room: {training_folder}")

        # Emit training results for the specified folder
        try:
            model_manager.emit_training_results(training_folder)
        except Exception as e:
            logging.error(f"Failed to emit training results for {training_folder}: {e}")
            emit('training_results_error', {'message': 'Failed to retrieve training results'})

        logging.info(f"Emitted training results for {training_folder}")


    @detection_controller.route('/upload', methods=['POST'])
    def upload_file():
        """Endpoint to upload a file (image or video)."""
        try:
            source, is_image = _get_source(request)
            file_key = str(uuid.uuid4())
            
            # Save the file to the cache directory
            cache_file_path = os.path.join(CACHE_DIR, file_key)
            with open(cache_file_path, 'wb') as cache_file:
                cache_file.write(source)
            
            return jsonify({"file_key": file_key}), 200
        except ValueError as e:
            logging.error(f"File upload error: {str(e)}")
            return jsonify({'error': str(e)}), 400
        except UnsupportedMediaTypeError as e:
            logging.error(f"Unsupported media type: {str(e)}")
            return jsonify({'error': str(e)}), 415
        except Exception as e:
            logging.exception("Unexpected error during upload")
            return jsonify({'error': 'An unexpected error occurred during upload'}), 500

    @detection_controller.route('/start_process', methods=['POST'])
    def start_process():
        """Endpoint to start the detection process."""
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

            # Initialize detection service if not already done
            with service_lock:
                if detection_controller.detection_service is None:
                    raise RuntimeError('Detection service not initialized. Set a model first using /set_models.')

            detection_controller.detection_service.start_processing(
                file_buffer, is_image=is_image, file_key=file_key
            )

            # Remove the cached file after starting processing to free up space
            os.remove(cache_file_path)

            return jsonify({"message": "Processing started"}), 200
        except ValueError as e:
            logging.error(f"Process start error: {str(e)}")
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            logging.exception("Unexpected error during process start")
            return jsonify({'error': 'An unexpected error occurred during processing start'}), 500

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

        if content_type == 'application/json':
            if req.json and 'video_source' in req.json:
                return req.json['video_source'], False  # Assuming URL or file path, not bytes, not image

        raise ValueError('No valid video or image source provided')

    class UnsupportedMediaTypeError(Exception):
        """Custom exception for unsupported media types."""
        pass

    @socketio.on('join')
    def on_join(data):
        file_key = data['file_key']
        join_room(file_key)
        logging.info(f"Client joined room: {file_key}")
        
    

    return detection_controller
