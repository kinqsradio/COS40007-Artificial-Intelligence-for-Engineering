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
from dotenv import load_dotenv
from models import YoloModel, FastSamModel

load_dotenv(dotenv_path="group_assignment/.env", override=True)

logging.basicConfig(level=logging.INFO)

# Helper
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
                 segmentation_model: FastSamModel,
                 socketio: SocketIO = None,
                ): 
        
        self.yolo_model = yolo_model
        self.segmentation_model = segmentation_model
        self.socketio = socketio
        self.lock = threading.Lock()
        logging.info("DetectionService initialized.")
        
    async def detect(self, source=None, is_image=False, file_key=None):
        temp_path = None
        videocapture = None
        
        try:
            if source is None:
                logging.error('Source is None')
                raise ValueError('Invalid Source Data')
            
            logging.info(f"Starting processing for source of type {type(source)}")
            if is_image:
                frame = cv2.imdecode(np.frombuffer(source, np.uint8), cv2.IMREAD_COLOR)
                if frame is None:
                    raise Exception("Could not open image source.")
                await self.process_frame(frame, file_key)
            else:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
                    temp_file.write(source)
                    temp_path = temp_file.name
                    logging.info(f"Temporary file created at {temp_path}")
                videocapture = cv2.VideoCapture(temp_path)
                if not videocapture.isOpened():
                    logging.error(f"Failed to open video source: {temp_path}")
                    raise Exception("Could not open video source.")
                while videocapture.isOpened():
                    start_time = time.time()
                    success, frame = videocapture.read()
                    if not success:
                        break
                    await self.process_frame(frame, file_key)
                
        except Exception as e:
            logging.error("Error during detection", str(e))
        finally:
            if videocapture and videocapture.isOpened():
                videocapture.release()
            cv2.destroyAllWindows()

            torch.cuda.empty_cache()
            del self.yolo_model
            del self.segmentation_model
            del self.socketio
            gc.collect()

            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                logging.info(f"Temporary file {temp_path} deleted.")

            logging.info("Finished processing.")

    def process_frame(self, frame, file_key):
        with self.lock:
            try:
                try:
                    detection_results = self.yolo_model.track(
                        frame
                    )
                    detection_results_json = detection_results[0].to_json()
                    detection_img = detection_results[0].plot()
                    detection_bboxes = detection_results[0].boxes.xyxy
                    if detection_results and len(detection_bboxes) > 0:
                        try:
                            segmentation_results = self.segmentation_model.track(
                                frame,
                                detection_bboxes
                            )
                            segmentation_results_json = segmentation_results[0].to_json()
                            segmentation_img = segmentation_results[0].plot()
                        except Exception as e:
                            logging.error("Error during segmentation", str(e))
                            segmentation_results_json = []
                            segmentation_img = frame.copy()
                except Exception as e:
                    logging.error("Error during detection", str(e))
                    detection_results_json = []
                    detection_img = frame.copy()
                    segmentation_results_json = []
                    segmentation_img = frame.copy()
            except Exception as e:
                logging.error("Error during processing", str(e))
                detection_results_json = []
                detection_img = frame.copy()
                segmentation_results_json = []
                segmentation_img = frame.copy()
            
            # Emit Frames
            _, frame_encoded = cv2.imencode(".jpg", frame)
            frame_base64 = base64.b64encode(frame_encoded).decode('utf-8')
            self.socketio.emit('frame', {'data': frame_base64}, room=file_key)
            
            _, detection_encoded = cv2.imencode(".jpg", detection_img)
            detection_base64 = base64.b64encode(detection_encoded).decode('utf-8')
            self.socketio.emit('detection_frame', {'data': detection_base64}, room=file_key)
            
            _, segmentation_encoded = cv2.imencode(".jpg", segmentation_img)
            segmentation_base64 = base64.b64encode(segmentation_encoded).decode('utf-8')
            self.socketio.emit('segmentation_frame', {'data': segmentation_base64}, room=file_key)

            # Emit Json results
            detection_results_json_serializable = convert_numpy(detection_results_json)
            segmentation_results_json_serializable = convert_numpy(segmentation_results_json)
            
            self.socketio.emit('detection_results_json', {'data': detection_results_json_serializable}, room=file_key)
            self.socketio.emit('segmentation_results_json', {'data': segmentation_results_json_serializable}, room=file_key)
            
            
    def start_processing(self, source, is_image=False, file_key=None):
        threading.Thread(target=lambda: asyncio.run(
            self.detect(source, is_image=is_image, file_key=file_key)
        )).start()