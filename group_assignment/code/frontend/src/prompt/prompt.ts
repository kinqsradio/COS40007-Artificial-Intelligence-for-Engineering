export const default_message = 'Hi! I am here to help you answer questions related to the provided training results and project details. You can ask me about specific metrics, patterns, or insights from the CSV data, configuration details in the YAML file, or project details.';

export const detection_default_message = 'Hi! I am here to help you answer questions related to the detection results. You can ask me about the objects detected in the image, their locations, the confidence levels of the detections, and the accuracy of the results. I can also help explain any anomalies or unexpected elements in the detection frame, discuss potential improvements, and provide insights into the overall quality of the detection. Feel free to ask about any other relevant features or details that stand out in the image.';

export const system_message = 'You are a specialized assistant designed to answer questions related to the provided training results in the CSV file, configuration in the YAML file, and the overall project brief. If the user asks a question outside the scope of this data, politely redirect them to focus on the CSV, YAML, or project details.';

export const projectBrief = `
COS40007 – AI for Engineering
Project Brief
Studio Session – 1-3
Group – 2
Theme – 1
Members –
• Rupayan Banerjee (103538229)
• Vivek Saini (103828056)
• Tran Duc Anh Dang (103995439)
• Lochana Hettiarachchi (103517367)
• Akindu Wikramarachchi (104084367)

Introduction
Urban infrastructure maintenance is a critical aspect of modern city management, directly impacting public safety and the overall aesthetic of the environment. Traditional methods of monitoring roadside assets like signs and cleanliness rely heavily on manual inspections, which are time consuming and prone to delays. Our team is motivated to fit the power of artificial intelligence to automate this process, thereby enhancing efficiency and responsiveness.

Background and Motivation
We chose this project due to our collective interest in computer vision and its practical applications in solving real world problems. By developing an AI model that detects issues such as damaged road signs and illegally dumped rubbish from images, we aim to contribute to the development of smarter cities.

Potential Users
• City Councils and Municipal Authorities: For monitoring and maintenance scheduling.
• Maintenance Teams: To receive timely information about issues requiring attention.
• Urban Planners: To analyse trends in asset degradation and waste disposal.

User Tasks
• Automated Detection: Identify and categorize roadside issues from image feeds.
• Resource Allocation: Prioritize maintenance tasks based on severity and type.
• Data Analysis: Monitor patterns to inform policy decisions.

Project Objectives
Primary Questions
1. How accurately can an AI model detect and classify roadside issues using image data?
2. Can the model differentiate between various types of rubbish and damage to provide detailed insights?

Goals
• Enhance our understanding of deep learning techniques in object detection.
• Gain hands-on experience with data annotation and model training.

Project Deliverables
• A trained AI model capable of detecting and classifying roadside issues.
• A user interface for easy interaction with the model.
• Comprehensive evaluation metrics demonstrating model performance.

Benefits
For Users
• Streamlined maintenance processes.
• Improved allocation of resources leading to cost savings.
• Enhanced urban cleanliness and safety.

For Our Team
• Development of practical AI skills applicable in the engineering field.
• Experience in collaborative project management.
• Contribution to societal well-being through technology.

Project Schedule
Week 7
• Task: Data Annotation (Rubbish Dataset)
- Annotate images in the "rubbish" dataset with bounding boxes for rubbish and 10 common objects such as mattress, couch, toy, etc.
- Assigned to: All members (equally distributed workload)
• Task: Research Pre-trained Models for Object Detection
- Identify and research potential object detection models like YOLOv5 or Faster R-CNN for implementation.
- Assigned to: Vivek Saini, Lochana Hettiarachchi, Akindu Wikramarachchi
• Task: Project Brief
- Drafting a Project Brief and projecting a predicted project schedule.
- Assigned to: Rupayan Banerjee, Tran Duc Anh Dang

Week 8
• Task: Data Annotation (continued if not completed)
- Annotate images in the "rubbish" dataset with bounding boxes for rubbish and 10 common objects such as mattress, couch, toy, etc.
- Assigned to: All members
• Task: Data Preprocessing
- Resize images, normalize pixel values, and apply data augmentation techniques (like flipping, rotating) to balance the dataset.
- Assigned to: Rupayan Banerjee, Tran Duc Anh Dang
• Task: Model Training (Initial Phase)
- Train the model on the annotated "rubbish" and "not rubbish" datasets to classify rubbish and non-rubbish objects.
- Assigned to: Vivek Saini, Lochana Hettiarachchi, Akindu Wikramarachchi

Week 9
• Task: Implement Data Loading Pipelines
- Create and test data pipelines using TensorFlow or PyTorch for loading and processing images.
- Assigned to: Tran Duc Anh Dang, Vivek Saini, Akindu Wikramarachchi
• Task: Model Training (Fine-tuning)
- Fine-tune the model on rubbish detection, adjusting hyperparameters for better accuracy.
- Assigned to: Lochana Hettiarachchi, Rupayan Banerjee

Week 10
• Task: Project Presentation Development
- Begin working on developing the project presentation.
- Assigned to: All members
• Task: Model Evaluation & Testing
- Evaluate model performance on a test set, analyse accuracy, precision, recall, and adjust if necessary.
- Assigned to: All members

Week 11
• Task: Finalize User Interface
- Refine the UI based on feedback and integrate it with the trained model.
- Assigned to: Rupayan Banerjee
• Task: Project Report
- Getting started on documenting everything about the project in the final report document.
- Assigned to: All members (equally distributed workload)

Week 12
• Task: Final Testing & Optimization
- Perform final testing with all datasets and optimize the model for deployment.
- Assigned to: All members
• Task: Project Report Submission
- Prepare the final report once everything is perfect.
- Assigned to: All members

Data
Data Source
Our project utilizes the "rubbish" and "not rubbish" datasets provided under Theme1 in the project folder, focusing solely on identifying rubbish-related issues in urban environments. We have chosen not to use the damaged-sign3 dataset, which contains images of damaged and undamaged road signs.
• Rubbish Dataset: This dataset consists of images showing various types of illegally dumped rubbish along roadsides. Common objects found in these images include mattresses, electrical goods, furniture, couches, toys, and more. Each image varies in terms of object types and positioning, providing a diverse set of examples for the model to learn from.
• Not Rubbish Database: This dataset contains images of roadside areas that do not include any rubbish. These images act as negative samples and help the model learn to differentiate between scenes with rubbish and those without.

Data Processing
We anticipate significant efforts in data cleanup and pre-processing:
• Labelling:
- Using LabelMe to annotate images with bounding.
- Convert data into COCO format for object detection frameworks.
- Categorizing each annotation.
- Resizing and normalising images.
• Addressing Data Imbalance:
- Applying data augmentation to balance the dataset.

Requirements
Must Have Functionalities/Features
• Accurate Detection and Localization:
- The AI model must accurately detect the presence, position, and boundaries of rubbish in the images. It will use bounding boxes to localize the objects, ensuring that the identified rubbish is within a precise boundary.
- Rationale: Accurate localization is critical for maintenance teams to act upon the identified issues efficiently.
• Classification of Issues:
- The system must classify various types of rubbish such as mattresses, electrical goods, couches, toys, and more. For each detected object, the model will provide a category label.
- Rationale: This allows city councils to prioritize and allocate specific types of waste disposal services for different rubbish categories.
• Confidence Scoring:
- Each detection will include a confidence score (a value between 0 and 1) that indicates the reliability of the model’s prediction. This confidence score helps users assess the accuracy and trustworthiness of the detection.
- Rationale: Confidence scores will assist users in deciding whether further manual verification is required or if the model's output can be trusted directly.
• User Interface:
- The model will be accessible through a user-friendly interface where users can upload images of roadside areas. The UI will display the detected rubbish objects along with bounding boxes and confidence scores, providing an easy way for users to review results.
- Rationale: A simple interface ensures that even non-technical users, such as maintenance teams, can utilize the AI system efficiently.

Optional Features
• Real-Time Analysis:
- The ability to process live video streams or real-time image feeds from vehicle-mounted cameras for immediate rubbish detection and classification. This would enable city councils to monitor areas in real-time and respond faster to emerging issues.
- Rationale: Real-time analysis can help maintenance teams act quickly, reducing response time and improving urban cleanliness. However, due to resource limitations, this feature is considered optional and can be implemented in the future.
• Scalability:
- The system will be designed with scalability in mind, capable of handling a large volume of images efficiently. This will allow the model to be deployed across a wider range of areas or even city-wide infrastructures without sacrificing performance.
- Rationale: For large cities or areas with extensive roadside assets, scalability is a key feature that would enable the model to handle data from multiple sources. It is not critical for the initial deployment, but it’s a useful future enhancement.
• Integration Capabilities:
- The AI model could be integrated with existing city council systems to provide automated issue reporting. This would allow the detected rubbish data to be seamlessly communicated to maintenance teams for quicker action.
- Rationale: Automated integration would streamline the process of reporting and resolving roadside issues. While this feature is optional, it would significantly enhance the overall value of the project.
`;