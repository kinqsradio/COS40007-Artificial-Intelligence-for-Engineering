import '../css/Detection.css';
import React, { useEffect, useState, useMemo } from 'react';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import StartProcess from './StartProcess';
import ImageResults from './ImageResults';
import TrainingResults from './TrainingResults';
import GroqTrainingResultsChat from './GroqTrainingResultsChat';
import GroqDetectionResultsChat from './GroqDetectionResultsChat';
import { fetchModels } from '../services/api';
import { ListModelsResponse } from '../types/models';

const Detection: React.FC = () => {
    const [fileKey, setFileKey] = useState<string | null>(null);
    const [isImage, setIsImage] = useState<boolean>(true);
    const [selectedTrainingFolder, setSelectedTrainingFolder] = useState<string | null>('None');
    const [isChatStarted, setIsChatStarted] = useState<boolean>(false);
    const [csvContent, setCsvContent] = useState<string>('');
    const [yamlContent, setYAMLContent] = useState<string>('');
    const [explainImageData, setExplainImageData] = useState<string | null>(null);
    const [imageDescription, setImageDescription] = useState<string | null>(null);

    useEffect(() => {
        async function loadDefaultModel() {
            try {
                if (selectedTrainingFolder === 'None') { // Only load the default model if none is selected
                    const models: ListModelsResponse = await fetchModels();
                    if (models.detection_models.length > 0) {
                        const initialModelPath = models.detection_models[0];
                        const folder = initialModelPath.split('/')[0];
                        setSelectedTrainingFolder(folder);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch models', error);
            }
        }
    
        loadDefaultModel();
    }, [selectedTrainingFolder]); // Add selectedTrainingFolder as a dependency
    

    const handleModelSetSuccess = (modelPath: string) => {
        const folder = modelPath.split('/')[0];
        setSelectedTrainingFolder(folder);
        setFileKey(null);
    };

    const handleFileUpload = (uploadedFileKey: string) => {
        setFileKey(uploadedFileKey);
        setIsImage(true);
        setIsChatStarted(false); // Stop the chat when a file is uploaded
    };

    const handleRestart = () => {
        setFileKey(null);
        setIsImage(true);
        setSelectedTrainingFolder('None');
        setCsvContent('');
        setYAMLContent('');
        setExplainImageData(null);
        setImageDescription(null);
        setIsChatStarted(false); // Ensure the chat is stopped on restart
    };

    const toggleChat = () => {
        setIsChatStarted(!isChatStarted);
    };

    const handleTrainingResultsUpdate = (results: { [key: string]: any }) => {
        const csvResult = results['results.csv'];
        const yamlResult = results['args.yaml'];
        if (csvResult && csvResult.type === 'text') {
            setCsvContent(csvResult.data);
        } else {
            console.warn('CSV content not found in training results');
        }
        if (yamlResult && yamlResult.type === 'text') {
            setYAMLContent(yamlResult.data);
        } else {
            console.warn('YAML content not found in training results');
        }
    };

    // Separate handleExplainImage functions for training and detection
    const handleExplainImageForTraining = (imageData: string, description: string) => {
        setExplainImageData(imageData);
        setImageDescription(description);
        setIsChatStarted(true); // Automatically start chat when explaining an image for training
    };

    const handleExplainImageForDetection = (imageData: string, description: string) => {
        setExplainImageData(imageData);
        setImageDescription(description);
        setIsChatStarted(true); // Automatically start chat when explaining an image for training
    };

    // Memoize the TrainingResults component to avoid re-renders when toggling chat visibility
    const memoizedTrainingResults = useMemo(() => {
        if (selectedTrainingFolder && selectedTrainingFolder !== 'None') {
            return (
                <TrainingResults
                    trainingFolder={selectedTrainingFolder}
                    onResultsUpdate={handleTrainingResultsUpdate}
                    onExplainImage={handleExplainImageForTraining}
                />
            );
        }
        return null;
    }, [selectedTrainingFolder]); // Only re-render if the selectedTrainingFolder changes

    // This function will clear the image data after it has been used
    const clearImageData = () => {
        setExplainImageData(null);
        setImageDescription(null);
    };

    return (
        <div className="detection-container">
            <div className="detection-controls">
                {!fileKey && (
                    <>
                        <ModelSelector onSuccess={handleModelSetSuccess} />
                        <FileUpload onFileUploaded={handleFileUpload} />
                    </>
                )}
                {fileKey && (
                    <>
                        <StartProcess fileKey={fileKey} isImage={isImage} />
                        <button className="restart-button" onClick={handleRestart}>
                            Restart
                        </button>
                    </>
                )}
                {/* Show the chat toggle button only for training-related activities and hide when detection is in progress */}
                {selectedTrainingFolder !== 'None' && !fileKey && (
                    <button className="toggle-chat-button" onClick={toggleChat}>
                        {isChatStarted ? 'Stop Chat' : 'Start Chat'}
                    </button>
                )}
            </div>
            <div className="detection-results">
                {fileKey ? (
                    <ImageResults
                        fileKey={fileKey}
                        onImageData={handleExplainImageForDetection} // Use the detection-specific handler
                    />
                ) : (
                    memoizedTrainingResults || (
                        <p>Please select a model or upload a file to start the detection process.</p>
                    )
                )}
            </div>
            {isChatStarted && (
                <div className="chat-container">
                    {/* Use GroqDetectionResultsChat if detection results are available, otherwise GroqTrainingResultsChat */}
                    {fileKey && explainImageData ? (
                        <GroqDetectionResultsChat
                            imageData={explainImageData}
                            imageDescription={imageDescription || ''} // Provide a default empty string
                        />
                    ) : selectedTrainingFolder !== 'None' ? (
                        <GroqTrainingResultsChat
                            csvContent={csvContent}
                            yamlContent={yamlContent}
                            imageData={explainImageData}
                            imageDescription={imageDescription || ''} // Provide a default empty string
                            clearImageData={clearImageData} // Pass the clear function to GroqChat
                            />
                    ) : (
                        <p>Please upload an image file or select training results to start the chat.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Detection;
