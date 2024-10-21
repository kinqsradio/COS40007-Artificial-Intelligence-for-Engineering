import albumentations as A
import os
import shutil
import math
from collections import OrderedDict
import json
import cv2
import PIL.Image
from sklearn.model_selection import train_test_split
from labelme import utils


class Labelme2YOLO(object):

    def __init__(self, json_dir, to_seg=False, num_augmentations=None):
        self._json_dir = json_dir
        self._label_id_map = self._get_label_id_map(self._json_dir)
        self._to_seg = to_seg
        self._augment = True
        self._num_augmentations = num_augmentations

        i = 'Augment_Dataset'
        i += '_seg/' if to_seg else '/'
        self._save_path_pfx = os.path.join(self._json_dir, i)

        # Define augmentation pipeline with various augmentations
        self._augmentation_pipeline = A.Compose([
            A.HorizontalFlip(p=0.5),  # Randomly flip the image horizontally with a 50% probability
            A.RandomBrightnessContrast(p=0.2),  # Randomly change the brightness and contrast with a 20% probability
            A.Rotate(limit=30, p=0.5),  # Randomly rotate the image within a range of +/- 30 degrees with a 50% probability
            A.RandomScale(scale_limit=0.2, p=0.5),  # Randomly scale the image within a limit of +/- 20% with a 50% probability
            A.Blur(blur_limit=7, p=0.3),  # Apply blur with a maximum kernel size of 7x7 with a 30% probability
            A.CLAHE(p=0.2),  # Apply Contrast Limited Adaptive Histogram Equalization with a 20% probability
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),  # Add Gaussian noise with a variance limit between 10.0 and 50.0 with a 30% probability
            A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20, p=0.3),  # Randomly change hue, saturation, and value with a 30% probability
            A.ChannelShuffle(p=0.2),  # Randomly shuffle the channels of the input RGB image with a 20% probability
            A.RandomGamma(gamma_limit=(80, 120), p=0.3),  # Randomly change the gamma of the image with a 30% probability
            A.CoarseDropout(max_holes=8, max_height=32, max_width=32, p=0.2),  # Randomly remove square patches from the image with a 20% probability
            A.MotionBlur(blur_limit=7, p=0.3),  # Apply motion blur with a maximum kernel size of 7x7 with a 30% probability
            A.Perspective(scale=(0.05, 0.1), p=0.3),  # Apply a perspective transformation with a 30% probability
            A.OpticalDistortion(distort_limit=0.05, shift_limit=0.05, p=0.3),  # Apply optical distortion with a 30% probability
            A.ElasticTransform(alpha=1, sigma=50, alpha_affine=None, p=0.3),  # Apply elastic transformations with a 30% probability
            A.GridDistortion(p=0.3),  # Apply grid distortion with a 30% probability
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['category_ids'], min_area=0, min_visibility=0))  # Ensure bounding boxes are adjusted accordingly


    def _make_train_val_dir(self):
        self._label_dir_path = os.path.join(self._save_path_pfx, 'labels/')
        self._image_dir_path = os.path.join(self._save_path_pfx, 'images/')

        for yolo_path in (os.path.join(self._label_dir_path + 'train/'),
                          os.path.join(self._label_dir_path + 'val/'),
                          os.path.join(self._image_dir_path + 'train/'),
                          os.path.join(self._image_dir_path + 'val/')):
            if os.path.exists(yolo_path):
                shutil.rmtree(yolo_path)
            os.makedirs(yolo_path)

    def _get_label_id_map(self, json_dir):
        label_set = set()
        for file_name in os.listdir(json_dir):
            if file_name.endswith('json'):
                json_path = os.path.join(json_dir, file_name)
                data = json.load(open(json_path))
                for shape in data['shapes']:
                    label_set.add(shape['label'])
        return OrderedDict([(label, label_id) for label_id, label in enumerate(label_set)])

    def _train_test_split(self, folders, json_names, val_size):
        if len(folders) > 0 and 'train' in folders and 'val' in folders:
            train_folder = os.path.join(self._json_dir, 'train/')
            train_json_names = [train_sample_name + '.json'
                                for train_sample_name in os.listdir(train_folder)
                                if os.path.isdir(os.path.join(train_folder, train_sample_name))]

            val_folder = os.path.join(self._json_dir, 'val/')
            val_json_names = [val_sample_name + '.json'
                              for val_sample_name in os.listdir(val_folder)
                              if os.path.isdir(os.path.join(val_folder, val_sample_name))]

            return train_json_names, val_json_names

        train_idxs, val_idxs = train_test_split(range(len(json_names)),
                                                test_size=val_size)
        train_json_names = [json_names[train_idx] for train_idx in train_idxs]
        val_json_names = [json_names[val_idx] for val_idx in val_idxs]

        return train_json_names, val_json_names

    def convert(self, val_size):
        json_names = [file_name for file_name in os.listdir(self._json_dir)
                      if os.path.isfile(os.path.join(self._json_dir, file_name)) and
                      file_name.endswith('.json')]
        folders = [file_name for file_name in os.listdir(self._json_dir)
                   if os.path.isdir(os.path.join(self._json_dir, file_name))]
        train_json_names, val_json_names = self._train_test_split(folders, json_names, val_size)

        self._make_train_val_dir()

        # Convert LabelMe object to YOLO format, and save images/labels
        for target_dir, json_names in zip(('train/', 'val/'), (train_json_names, val_json_names)):
            for json_name in json_names:
                json_path = os.path.join(self._json_dir, json_name)
                json_data = json.load(open(json_path))

                print(f"Converting {json_name} for {target_dir.replace('/', '')}...")

                # Save original and augmented images/labels
                img_path = self._save_yolo_image(json_data, json_name, self._image_dir_path, target_dir)
                yolo_obj_list = self._get_yolo_object_list(json_data, img_path)
                self._save_yolo_label(json_name, self._label_dir_path, target_dir, yolo_obj_list)

        print("Generating dataset.yaml file...")
        self._save_dataset_yaml()

    def _get_yolo_object_list(self, json_data, img_path):
        yolo_obj_list = []
        img_h, img_w, _ = cv2.imread(img_path).shape
        for shape in json_data['shapes']:
            if shape['shape_type'] == 'circle':
                yolo_obj = self._get_circle_shape_yolo_object(shape, img_h, img_w)
            else:
                yolo_obj = self._get_other_shape_yolo_object(shape, img_h, img_w)
            yolo_obj_list.append(yolo_obj)
        return yolo_obj_list

    def _get_circle_shape_yolo_object(self, shape, img_h, img_w):
        label_id = self._label_id_map[shape['label']]
        obj_center_x, obj_center_y = shape['points'][0]

        radius = math.sqrt((obj_center_x - shape['points'][1][0]) ** 2 +
                           (obj_center_y - shape['points'][1][1]) ** 2)

        obj_w = 2 * radius
        obj_h = 2 * radius

        yolo_center_x = round(float(obj_center_x / img_w), 6)
        yolo_center_y = round(float(obj_center_y / img_h), 6)
        yolo_w = round(float(obj_w / img_w), 6)
        yolo_h = round(float(obj_h / img_h), 6)

        return label_id, yolo_center_x, yolo_center_y, yolo_w, yolo_h

    def _get_other_shape_yolo_object(self, shape, img_h, img_w):
        label_id = self._label_id_map[shape['label']]

        def __get_object_desc(obj_port_list):
            __get_dist = lambda int_list: max(int_list) - min(int_list)
            x_lists = [port[0] for port in obj_port_list]
            y_lists = [port[1] for port in obj_port_list]
            return min(x_lists), __get_dist(x_lists), min(y_lists), __get_dist(y_lists)

        obj_x_min, obj_w, obj_y_min, obj_h = __get_object_desc(shape['points'])

        yolo_center_x = round(float((obj_x_min + obj_w / 2.0) / img_w), 6)
        yolo_center_y = round(float((obj_y_min + obj_h / 2.0) / img_h), 6)
        yolo_w = round(float(obj_w / img_w), 6)
        yolo_h = round(float(obj_h / img_h), 6)

        return label_id, yolo_center_x, yolo_center_y, yolo_w, yolo_h

    def _save_yolo_label(self, json_name, label_dir_path, target_dir, yolo_obj_list):
        txt_path = os.path.join(label_dir_path, target_dir, json_name.replace('.json', '.txt'))
        self._write_yolo_label(txt_path, yolo_obj_list)

    def _write_yolo_label(self, txt_path, yolo_obj_list):
        with open(txt_path, 'w+') as f:
            for yolo_obj in yolo_obj_list:
                yolo_obj_line = " ".join(map(str, yolo_obj))
                f.write(f"{yolo_obj_line}\n")

    def _save_yolo_image(self, json_data, json_name, image_dir_path, target_dir):
        original_extension = os.path.splitext(json_data['imagePath'])[1].lower()
        if original_extension not in ['.jpg', '.jpeg', '.png', '.bmp']:
            original_extension = '.png'

        img_name = json_name.replace('.json', original_extension)
        img_path = os.path.join(image_dir_path, target_dir, img_name)

        img = utils.img_b64_to_arr(json_data['imageData'])
        PIL.Image.fromarray(img).save(img_path)

        # Generate augmented versions if augmentation is enabled
        if self._augment:
            num_augments = self._num_augmentations if self._num_augmentations is not None else 0
            yolo_obj_list = self._get_yolo_object_list(json_data, img_path)
            for i in range(num_augments):
                try:
                    augmented_img, augmented_yolo_obj_list = self._apply_augmentation(img, yolo_obj_list)
                    augmented_img_name = json_name.replace('.json', f'_aug{i}{original_extension}')
                    augmented_img_path = os.path.join(image_dir_path, target_dir, augmented_img_name)
                    PIL.Image.fromarray(augmented_img).save(augmented_img_path)

                    # Save the augmented labels
                    augmented_txt_name = json_name.replace('.json', f'_aug{i}.txt')
                    augmented_txt_path = os.path.join(self._label_dir_path, target_dir, augmented_txt_name)
                    self._write_yolo_label(augmented_txt_path, augmented_yolo_obj_list)

                except Exception as e:
                    print(f"Cannot augment {json_name} for augmentation {i}: {e}")

        return img_path

    def _apply_augmentation(self, img, yolo_obj_list):
        bboxes = [obj[1:] for obj in yolo_obj_list]
        categories = [obj[0] for obj in yolo_obj_list]

        augmented = self._augmentation_pipeline(image=img, bboxes=bboxes, category_ids=categories)

        augmented_bboxes = [
            [cat] + [max(0.0, min(1.0, coord)) for coord in bbox]
            for cat, bbox in zip(categories, augmented['bboxes'])
        ]

        augmented_bboxes = [
            bbox for bbox in augmented_bboxes if bbox[3] > 0.0 and bbox[4] > 0.0
        ]

        return augmented['image'], augmented_bboxes

    def _save_dataset_yaml(self):
        yaml_path = os.path.join(self._save_path_pfx, 'dataset.yaml')
        with open(yaml_path, 'w+') as yaml_file:
            yaml_file.write('train: %s\n' % os.path.join(self._image_dir_path, 'train/'))
            yaml_file.write('val: %s\n\n' % os.path.join(self._image_dir_path, 'val/'))
            yaml_file.write('nc: %i\n\n' % len(self._label_id_map))
            names_str = ', '.join([f"'{label}'" for label in self._label_id_map.keys()])
            yaml_file.write(f'names: [{names_str}]')


# Usage example
if __name__ == '__main__':
    converter = Labelme2YOLO(
        json_dir='/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/datasets/data/data/rubbish',
        to_seg=False,
        num_augmentations=20
    )
    converter.convert(val_size=0.1)
