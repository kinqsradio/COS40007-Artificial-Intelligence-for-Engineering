import os
from models import YoloModel, FastSamModel

class Manager:
    def __init__(self, models_folder):
        self.models_folder = models_folder
        self.models = {
            'yolo': {},
            'fastsam': {}
        }
        self.models_types = []
                
    def get_model_type(self):
        if not os.path.exists(self.models_folder):
            return self.models_types
        
        for folder_name in os.listdir(self.models_folder):
            if os.path.isdir(os.path.join(self.models_folder, folder_name)):
                self.models_types.append(folder_name)
                
        return self.models_types
    
    def list_models(self, model_type, model_class):
        models_folder = os.path.join(self.models_folder, model_type)
        if not os.path.exists(models_folder):
            return {}
        
        for file_name in os.listdir(models_folder):
            if file_name.endswith(".pt"):
                model_path = os.path.join(models_folder, file_name)
                print(f'{model_path}')
                model_instance = model_class(model_path)
                model_name = os.path.splitext(file_name)[0]
                self.models[model_type][model_name] = model_instance
        return self.models[model_type]
    
    def list_yolo_models(self):
        return self.list_models('yolo', YoloModel)
    
    def list_fastsam_models(self):
        return self.list_models('fastsam', FastSamModel)
    
    def get_detection_model_classes(self, model_name, model_type='yolo'):
        if model_name in self.models[model_type] and model_type=='yolo':
            return self.models[model_type][model_name].class_labels()
        return []
