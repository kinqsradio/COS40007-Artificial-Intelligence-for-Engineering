from ultralytics import YOLO

# Load a model
def train(model_name):
    model = YOLO(f'{model_name}.pt')

    # Train the model with 2 GPUs
    results = model.train(
        data='/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/datasets/data/data/rubbish/Dataset/dataset.yaml', 
        epochs=150, 
        imgsz=640,
        batch=32,
        project='group_assignment/runs/train',
        name=f'{model_name}_150_epochs_augment_dataset',
        augment=True                   
    )

yolo11n = train('yolo11n')
yolo11s = train('yolo11s')
yolo11m = train('yolo11m')
