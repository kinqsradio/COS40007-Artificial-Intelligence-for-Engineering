import numpy as np
import torch
import cv2
import gc
import os
import time
import base64
import tempfile
import threading
import asyncio
import logging
from flask_socketio import SocketIO
from models import YoloModel

logging.basicConfig(level=logging.INFO)

def convert_numpy(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

class DetectionService:
    def __init__(self, 
                 yolo_model: YoloModel,
                 socketio: SocketIO = None):
        self.yolo_model = yolo_model
        self.socketio = socketio
        self.lock = threading.Lock()
        logging.info("DetectionService initialized.")
    
    async def detect(self, source=None, is_image=False, file_key=None):
        temp_path = None
        videocapture = None

        try:
            if source is None:
                raise ValueError("Invalid source data: Source is None")
            
            if is_image:
                frame = cv2.imdecode(np.frombuffer(source, np.uint8), cv2.IMREAD_COLOR)
                if frame is None:
                    raise Exception("Could not decode image from source.")
                self.process_frame(frame, file_key)
            else:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
                    temp_file.write(source)
                    temp_path = temp_file.name
                videocapture = cv2.VideoCapture(temp_path)
                if not videocapture.isOpened():
                    raise Exception(f"Could not open video source: {temp_path}")
                
                while videocapture.isOpened():
                    success, frame = videocapture.read()
                    if not success:
                        break
                    self.process_frame(frame, file_key)

        except Exception as e:
            logging.error(f"Error during detection: {str(e)}")
        finally:
            if videocapture and videocapture.isOpened():
                videocapture.release()
            cv2.destroyAllWindows()
            self.cleanup_resources(temp_path)
            logging.info("Finished processing.")

    def process_frame(self, frame, file_key):
        with self.lock:
            try:
                if frame is None or frame.size == 0:
                    raise ValueError("Invalid frame: Frame is empty or None")

                detection_results_json = []
                detection_img = frame.copy()

                try:
                    # Perform detection
                    detection_results = list(self.yolo_model.track(frame))
                    detection_results_json = detection_results[0].to_json() if detection_results else []
                    detection_img = detection_results[0].plot() if detection_results else frame.copy()

                except Exception as e:
                    logging.error(f"Error during detection: {str(e)}")

            except Exception as e:
                logging.error(f"Error during processing: {str(e)}")

            self.emit_results(frame, detection_img, detection_results_json, file_key)

    def emit_results(self, original_frame, detection_frame, detection_results_json, file_key):
        try:
            # Emit original frame
            _, frame_encoded = cv2.imencode(".jpg", original_frame)
            frame_base64 = base64.b64encode(frame_encoded).decode('utf-8')
            self.socketio.emit('frame', {'data': frame_base64}, room=file_key)

            # Emit detection frame
            _, detection_encoded = cv2.imencode(".jpg", detection_frame)
            detection_base64 = base64.b64encode(detection_encoded).decode('utf-8')
            self.socketio.emit('detection_frame', {'data': detection_base64}, room=file_key)

            # Emit JSON results
            detection_results_json_serializable = convert_numpy(detection_results_json)
            self.socketio.emit('detection_results_json', {'data': detection_results_json_serializable}, room=file_key)

            # Notify clients that processing is complete
            self.socketio.emit('processing_complete', {'file_key': file_key}, room=file_key)
            logging.info("Results emitted successfully.")
        except Exception as e:
            logging.error(f"Error emitting results: {str(e)}")

    def start_processing(self, source, is_image=False, file_key=None):
        threading.Thread(target=lambda: asyncio.run(
            self.detect(source, is_image=is_image, file_key=file_key)
        ), daemon=True).start()

    def cleanup_resources(self, temp_path):
        # Free resources
        torch.cuda.empty_cache()
        gc.collect()

        # Remove temporary files
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            logging.info(f"Temporary file {temp_path} deleted.")

    def clear_resources(self):
        if self.yolo_model:
            del self.yolo_model
        torch.cuda.empty_cache()
        gc.collect()
