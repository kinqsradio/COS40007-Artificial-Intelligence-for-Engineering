from ultralytics import YOLO
from .settings import ModelSettings
import gc

class YoloModel(ModelSettings):
    def __init__(self, model_path: str, **kwargs): 
        super().__init__(**kwargs)
        self.model = YOLO(model_path)
        
    def track(self, image):
        results = self.model.track(
            image, 
            imgsz=self.imgsz, 
            conf=self.conf, 
            iou=self.iou, 
            tracker=self.tracker, 
            persist=self.persist, 
            stream=self.stream,
            augment=self.augment,
            agnostic_nms=self.agnostic_nms,
            half=self.half
        )
        gc.collect()
        return results