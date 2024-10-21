from ultralytics import YOLO

# Load a model
def train(model_name, epochs=150, augment=False):
    model = YOLO(f'{model_name}.pt')
    
    if augment:
        dataset='Augment_Dataset'
        name='augment_dataset'
    else:
        dataset='Dataset'
        name='original_dataset'
        
    
    return model.train(
        data=f'/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/datasets/data/data/rubbish/{dataset}/dataset.yaml', 
        epochs=epochs, 
        imgsz=640,
        batch=32,
        project='group_assignment/runs/train',
        name=f'{model_name}_{epochs}_epochs_{name}',
        augment=True                   
    )

yolo11n_original = train('yolo11n', epochs=150, augment=False)
yolo11s_original = train('yolo11s', epochs=150, augment=False)
yolo11m_original = train('yolo11m', epochs=150, augment=False)

yolo11n_augment = train('yolo11n', epochs=150, augment=True)
yolo11s_augment = train('yolo11s', epochs=150, augment=True)
yolo11m_augment = train('yolo11m', epochs=150, augment=True)
