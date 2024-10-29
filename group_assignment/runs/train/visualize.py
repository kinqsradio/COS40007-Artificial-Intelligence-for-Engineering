# Import necessary libraries
import pandas as pd
import matplotlib.pyplot as plt

# Load CSV files for each model's results
file_paths = {
    'yolo11n_augment': '/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/runs/train/yolo11n_150_epochs_augment_dataset/results.csv',
    'yolo11n_original': '/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/runs/train/yolo11n_150_epochs_original_dataset/results.csv',
    'yolo11s_augment': '/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/runs/train/yolo11s_150_epochs_augment_dataset/results.csv',
    'yolo11s_original': '/mnt/e/Projects/COS40007-Artificial-Intelligence-for-Engineering/group_assignment/runs/train/yolo11s_150_epochs_original_dataset/results.csv'
}

# Load data into a dictionary of DataFrames
df_results = {model_name: pd.read_csv(path) for model_name, path in file_paths.items()}

# Extract the final epoch results for each model to create a summary table
final_epoch_results = {
    model_name: df.iloc[-1][[
        'train/box_loss', 'train/cls_loss', 'train/dfl_loss', 
        'metrics/precision(B)', 'metrics/recall(B)', 'metrics/mAP50(B)', 
        'metrics/mAP50-95(B)', 'val/box_loss', 'val/cls_loss', 'val/dfl_loss'
    ]].rename(model_name)
    for model_name, df in df_results.items()
}

# Create a DataFrame from the final epoch results for summary comparison
final_epoch_df = pd.DataFrame(final_epoch_results).transpose()

# Display Summary Table for Final Epoch Performance (for report inclusion)
import ace_tools as tools; tools.display_dataframe_to_user(name="Final Model Evaluation Results", dataframe=final_epoch_df)

# Extract key metrics for each model to plot overall comparisons
model_labels = ["YOLO11n Augment", "YOLO11n Original", "YOLO11s Augment", "YOLO11s Original"]
precision = final_epoch_df['metrics/precision(B)']
recall = final_epoch_df['metrics/recall(B)']
mAP50 = final_epoch_df['metrics/mAP50(B)']
mAP50_95 = final_epoch_df['metrics/mAP50-95(B)']
val_box_loss = final_epoch_df['val/box_loss']
val_cls_loss = final_epoch_df['val/cls_loss']
val_dfl_loss = final_epoch_df['val/dfl_loss']

# Visualization 1: Precision and Recall Comparison
fig1, ax1 = plt.subplots(figsize=(8, 5))
ax1.bar(model_labels, precision, label="Precision", color='skyblue', alpha=0.7, width=0.3, align='center')
ax1.bar(model_labels, recall, label="Recall", color='orange', alpha=0.7, width=0.3, align='edge')
ax1.set_title("Precision and Recall Comparison")
ax1.set_ylabel("Score")
ax1.legend()
plt.show()

# Visualization 2: mAP Score Comparison
fig2, ax2 = plt.subplots(figsize=(8, 5))
ax2.bar(model_labels, mAP50, label="mAP50", color='green', alpha=0.7, width=0.3, align='center')
ax2.bar(model_labels, mAP50_95, label="mAP50-95", color='purple', alpha=0.7, width=0.3, align='edge')
ax2.set_title("Mean Average Precision (mAP) Score Comparison")
ax2.set_ylabel("Score")
ax2.legend()
plt.show()

# Visualization 3: Validation Loss Comparison
fig3, ax3 = plt.subplots(figsize=(8, 5))
bar_width = 0.2
ax3.bar(model_labels, val_box_loss, label="Box Loss", color='blue', alpha=0.7, width=bar_width, align='center')
ax3.bar(model_labels, val_cls_loss, label="Class Loss", color='red', alpha=0.7, width=bar_width, align='edge')
ax3.bar(model_labels, val_dfl_loss, label="DFL Loss", color='purple', alpha=0.7, width=bar_width, align='edge')
ax3.set_title("Validation Loss Comparison")
ax3.set_ylabel("Loss")
ax3.legend()
plt.show()

# Visualization 4: Training Loss Comparison
fig4, ax4 = plt.subplots(figsize=(8, 5))
ax4.bar(model_labels, final_epoch_df['train/box_loss'], label="Box Loss", color='blue', alpha=0.7, width=bar_width, align='center')
ax4.bar(model_labels, final_epoch_df['train/cls_loss'], label="Class Loss", color='red', alpha=0.7, width=bar_width, align='edge')
ax4.bar(model_labels, final_epoch_df['train/dfl_loss'], label="DFL Loss", color='purple', alpha=0.7, width=bar_width, align='edge')
ax4.set_title("Training Loss Comparison")
ax4.set_ylabel("Loss")
ax4.legend()
plt.show()

# Define function to visualize per-epoch metric progression for each model
def plot_metric_per_epoch(metric, title, ylabel):
    plt.figure(figsize=(10, 6))
    for model_name, df in df_results.items():
        plt.plot(df['epoch'], df[metric], label=model_name)
    plt.title(title)
    plt.xlabel("Epoch")
    plt.ylabel(ylabel)
    plt.legend()
    plt.show()

# Visualization of per-epoch metrics for Precision, Recall, mAP50, and mAP50-95
plot_metric_per_epoch('metrics/precision(B)', 'Model Precision per Epoch', 'Precision')
plot_metric_per_epoch('metrics/recall(B)', 'Model Recall per Epoch', 'Recall')
plot_metric_per_epoch('metrics/mAP50(B)', 'Model mAP50 per Epoch', 'mAP50')
plot_metric_per_epoch('metrics/mAP50-95(B)', 'Model mAP50-95 per Epoch', 'mAP50-95')
