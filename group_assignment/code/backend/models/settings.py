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