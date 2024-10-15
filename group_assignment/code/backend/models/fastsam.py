import gc
from ultralytics.models.fastsam import FastSAM
from .settings import ModelSettings

class FastSamModel(ModelSettings):
    def __init__(self, model_path: str, **kwargs): 
        super().__init__(**kwargs)
        self.model = FastSAM(model_path)
        
    def track(self, image, bboxes):
        points = (bboxes[:, :2] + bboxes[:, 2:]) / 2 if bboxes else None
        results =  self.model.track(
            image, 
            bboxes=bboxes, 
            points=points,
            imgsz=self.imgsz, 
            conf=self.conf, 
            iou=self.iou, 
            tracker=self.tracker, 
            persist=self.persist, 
            stream=self.stream,
        )
        gc.collect()
        return results
