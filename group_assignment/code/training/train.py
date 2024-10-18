from ultralytics import YOLO

# Load a model
model = YOLO("yolo11n.pt")  # load a pretrained model (recommended for training)

# Train the model with 2 GPUs
results = model.train(
    data='/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/datasets/data/data/rubbish/YOLODataset/dataset.yaml', 
    epochs=100, 
    imgsz=640,
    batch=32,
    project='group_assignment/runs/train',
    name=f'yolo11n_100_epochs'                   
)