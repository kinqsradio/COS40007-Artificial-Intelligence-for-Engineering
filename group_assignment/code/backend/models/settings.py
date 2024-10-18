from database import db

class ModelSettings:
    def __init__(self, 
                 imgsz=640, 
                 conf=0.1, 
                 iou=0.5, 
                 tracker="bytetrack.yaml", 
                 persist=True, 
                 stream_buffer=True, 
                 stream=True, 
                 augment=True,
                 agnostic_nms=False,
                 half=False):
         
        self.imgsz = imgsz
        self.conf = conf
        self.iou = iou
        self.tracker = tracker
        self.persist = persist
        self.stream_buffer = stream_buffer
        self.stream = stream
        self.augment = augment
        self.agnostic_nms = agnostic_nms
        self.half = half
        
class GlobalSettings(db.Model):
    __tablename__ = 'global_settings'

    id = db.Column(db.Integer, primary_key=True)
    detection_model_name = db.Column(db.String(100), nullable=False)

    @staticmethod
    def get_settings():
        return db.session.query(GlobalSettings).first()

    @staticmethod
    def update_settings(detection_model_name):
        settings = GlobalSettings.get_settings()
        if settings:
            db.session.delete(settings)
        settings = GlobalSettings(
            detection_model_name=detection_model_name,
        )
        db.session.add(settings)
        db.session.commit()
        return settings
