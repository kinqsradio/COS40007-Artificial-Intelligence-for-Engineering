from ultralytics import YOLO

# Load a model
def train(model_name, augment=False):
    model = YOLO(f'{model_name}.pt')
    
    if augment:
        dataset='Augment_Dataset'
        name='augment_dataset'
    else:
        dataset='Dataset'
        name='original_dataset'
        
    
    results = model.train(
        data=f'/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/datasets/data/data/rubbish/{dataset}/dataset.yaml', 
        epochs=150, 
        imgsz=640,
        batch=32,
        project='group_assignment/runs/train',
        name=f'{model_name}_150_epochs_{name}',
        augment=True                   
    )

yolo11n = train('yolo11n', augment=True)
yolo11s = train('yolo11s', augment=True)
yolo11m = train('yolo11m', augment=True)
