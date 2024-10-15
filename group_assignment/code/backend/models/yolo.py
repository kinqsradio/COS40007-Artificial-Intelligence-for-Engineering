from ultralytics import YOLO
from .settings import ModelSettings
import gc

class YoloModel(ModelSettings):
    def __init__(self, model_path: str, **kwargs): 
        super().__init__(**kwargs)
        self.model = YOLO(model_path)
        
    def track(self, image, classes):
        results = self.model.track(
            image, 
            classes=classes, 
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
    
    def class_labels(self):
        return self.model.names