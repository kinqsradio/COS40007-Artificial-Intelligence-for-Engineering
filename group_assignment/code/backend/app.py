from services.manager import Manager

folder = '/Users/anhdang/Documents/Github/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/models'
manager = Manager(folder)
manager.get_model_type()

print(manager.list_yolo_models())


# Assuming manager.models_types is a list
first_model_key = manager.list_yolo_models()['best_train1']
first_model = first_model_key

# Now you can use first_model as needed
print(f"Using model: {first_model_key}")

print(first_model.class_labels())
