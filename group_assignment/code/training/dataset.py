import os
import random
import numpy as np
import matplotlib.pyplot as plt
import torch
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
from pycocotools.coco import COCO
import labelme2coco
import yaml


class COCODataset(Dataset):
    def __init__(self, 
                 root, 
                 annotation, 
                 transforms=None):
        self.root = root
        self.coco = COCO(annotation)
        self.ids = list(sorted(self.coco.imgs.keys()))
        self.transforms = transforms

    def __getitem__(self, index):
        coco = self.coco
        img_id = self.ids[index]
        ann_ids = coco.getAnnIds(imgIds=img_id)
        anns = coco.loadAnns(ann_ids)
        img_info = coco.loadImgs(img_id)[0]
        path = img_info['file_name']

        # Load image
        img_path = os.path.join(self.root, path)
        img = Image.open(img_path).convert('RGB')

        # Load annotations
        num_objs = len(anns)
        boxes = []
        labels = []
        masks = []

        for ann in anns:
            xmin = ann['bbox'][0]
            ymin = ann['bbox'][1]
            width = ann['bbox'][2]
            height = ann['bbox'][3]
            xmax = xmin + width
            ymax = ymin + height
            boxes.append([xmin, ymin, xmax, ymax])
            labels.append(ann['category_id'])
            masks.append(coco.annToMask(ann))

        boxes = torch.as_tensor(boxes, dtype=torch.float32)
        labels = torch.as_tensor(labels, dtype=torch.int64)
        masks = torch.as_tensor(np.stack(masks, axis=0), dtype=torch.uint8)

        image_id = torch.tensor([img_id])
        area = (boxes[:, 3] - boxes[:, 1]) * (boxes[:, 2] - boxes[:, 0])
        iscrowd = torch.zeros((num_objs,), dtype=torch.int64)

        target = {}
        target['boxes'] = boxes
        target['labels'] = labels
        target['masks'] = masks
        target['image_id'] = image_id
        target['area'] = area
        target['iscrowd'] = iscrowd

        if self.transforms:
            img = self.transforms(img)

        return img, target

    def __len__(self):
        return len(self.ids)


class DatasetPreparation:
    def __init__(self, 
                 home_dir, 
                 data_dir, 
                 label_folder, 
                 train_split_rate=0.5, 
                 category_id_start=1, 
                 batch_size=32):
        
        self.HOME_DIR = home_dir
        self.DATASETS_DIR = os.path.join(self.HOME_DIR, data_dir)
        self.LABEL_FOLDER = os.path.join(self.DATASETS_DIR, label_folder)
        self.COCO_ANNOTATIONS_DIR = os.path.join(self.DATASETS_DIR, f'{label_folder}_coco_annotation')
        self.train_split_rate = train_split_rate
        self.category_id_start = category_id_start
        self.batch_size = batch_size

        # Create COCO annotation directory if it doesn't exist
        os.makedirs(self.COCO_ANNOTATIONS_DIR, exist_ok=True)
        self._convert_labelme_to_coco()

    def _convert_labelme_to_coco(self):
        # Convert LabelMe annotations to COCO format
        labelme2coco.convert(self.LABEL_FOLDER, 
                             self.COCO_ANNOTATIONS_DIR, 
                             self.train_split_rate, 
                             category_id_start=self.category_id_start)
        print("LabelMe annotations converted to COCO format")

    def get_datasets(self):
        # Define transformations
        transform = transforms.Compose([transforms.ToTensor()])

        # Paths to train and validation JSON annotations
        train_json = os.path.join(self.COCO_ANNOTATIONS_DIR, 'train.json')
        val_json = os.path.join(self.COCO_ANNOTATIONS_DIR, 'val.json')

        # Create Dataset instances
        train_dataset = COCODataset(root=self.LABEL_FOLDER, annotation=train_json, transforms=transform)
        val_dataset = COCODataset(root=self.LABEL_FOLDER, annotation=val_json, transforms=transform)
        
        return train_dataset, val_dataset

    def visualize_sample(self, dataset, index=None):
        if index is None:
            index = random.randint(0, len(dataset) - 1)
        
        img, target = dataset[index]
        img = img.permute(1, 2, 0).numpy()
        
        boxes = target['boxes'].numpy()
        labels = target['labels'].numpy()
        masks = target['masks'].numpy()
        
        plt.figure(figsize=(10, 10))
        plt.imshow(img)
        
        ax = plt.gca()
        
        for box in boxes:
            xmin, ymin, xmax, ymax = box
            rect = plt.Rectangle((xmin, ymin), xmax - xmin, ymax - ymin, fill=False, color='red', linewidth=2)
            ax.add_patch(rect)
        
        plt.axis('off')
        plt.show()

    def get_category_names(self, json_path):
        # Get category names from the COCO json file
        coco = COCO(json_path)
        categories = coco.loadCats(coco.getCatIds())
        category_names = [cat['name'] for cat in categories]
        return category_names

    def create_yaml(self):
        # Automatically create a YAML file
        train_json = os.path.join(self.COCO_ANNOTATIONS_DIR, 'train.json')
        val_json = os.path.join(self.COCO_ANNOTATIONS_DIR, 'val.json')

        category_names = self.get_category_names(train_json)

        yaml_data = {
            'train': self.LABEL_FOLDER,
            'val': self.LABEL_FOLDER,
            'train_ann': train_json,
            'val_ann': val_json,
            'nc': len(category_names),
            'names': category_names
        }

        yaml_path = os.path.join(self.COCO_ANNOTATIONS_DIR, 'dataset.yaml')
        with open(yaml_path, 'w') as outfile:
            yaml.dump(yaml_data, outfile, default_flow_style=False)

        print(f"YAML configuration file created at {yaml_path}")
        return yaml_path

    def get_dataloaders(self, num_workers=0, is_visualize=False):
        train_dataset, val_dataset = self.get_datasets()
        yaml_path=self.create_yaml()
        
        if is_visualize:
            self.visualize_sample(train_dataset)
            self.visualize_sample(val_dataset)
            
        return train_dataset, val_dataset, yaml_path

    
    
# Initialize the class with appropriate directories
prep = DatasetPreparation(
    home_dir='/Users/anhdang/Documents/Github/COS40007-Artificial-Intelligence-for-Engineering',
    data_dir='group_assignment/datasets/data/data',
    label_folder='rubbish',
    train_split_rate=0.9,
    category_id_start=1,
    batch_size=32
)

# Get the DataLoader objects
train_dataset, val_dataset, yaml_path = prep.get_dataloaders(num_workers=4, is_visualize=True)
print(yaml_path)


