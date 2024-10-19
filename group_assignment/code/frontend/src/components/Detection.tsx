import '../css/Detection.css';
import React, { useEffect, useState, useMemo } from 'react';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import StartProcess from './StartProcess';
import ImageResults from './ImageResults';
import TrainingResults from './TrainingResults';
import GroqChat from './GroqChat';
import { fetchModels } from '../services/api';
import { ListModelsResponse } from '../types/models';

const Detection: React.FC = () => {
    const [fileKey, setFileKey] = useState<string | null>(null);
    const [isImage, setIsImage] = useState<boolean>(true);
    const [selectedTrainingFolder, setSelectedTrainingFolder] = useState<string | null>('None');
    const [defaultModel, setDefaultModel] = useState<string | null>('None');
    const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
    const [csvContent, setCsvContent] = useState<string>('');
    const [yamlContent, setYAMLContent] = useState<string>('');


    useEffect(() => {
        async function loadDefaultModel() {
            try {
                const models: ListModelsResponse = await fetchModels();
                if (models.detection_models.length > 0) {
                    const initialModelPath = models.detection_models[0];
                    setDefaultModel(initialModelPath);
                    const folder = initialModelPath.split('/')[0];
                    setSelectedTrainingFolder(folder);
                }
            } catch (error) {
                console.error('Failed to fetch models', error);
            }
        }

        loadDefaultModel();
    }, []);

    const handleModelSetSuccess = (modelPath: string) => {
        const folder = modelPath.split('/')[0];
        setSelectedTrainingFolder(folder);
        setFileKey(null);
    };

    const handleFileUpload = (uploadedFileKey: string) => {
        setFileKey(uploadedFileKey);
        setIsImage(true);
        setIsChatVisible(false); // Hide the chat when a file is uploaded
    };

    const handleRestart = () => {
        setFileKey(null);
        setIsImage(true);
        setSelectedTrainingFolder('None');
        setDefaultModel('None');
        setCsvContent('');
        setYAMLContent('');
        setIsChatVisible(false); // Ensure the chat is hidden on restart
    };

    const toggleChatVisibility = () => {
        setIsChatVisible(!isChatVisible);
    };

    const handleTrainingResultsUpdate = (results: { [key: string]: any }) => {
        const csvResult = results['results.csv'];
        const yamlResult = results["args.yaml"];
        if (csvResult && csvResult.type === 'text') {
            setCsvContent(csvResult.data);
        } else {
            console.warn('CSV content not found in training results');
        }
        if (yamlResult && yamlResult.type === "text") {
            setYAMLContent(yamlResult.data);
        } else {
            console.warn('YAML content not found in training results');

        }
    };

    // Memoize the TrainingResults component to avoid re-renders when toggling chat visibility
    const memoizedTrainingResults = useMemo(() => {
        if (selectedTrainingFolder && selectedTrainingFolder !== 'None') {
            return (
                <TrainingResults
                    trainingFolder={selectedTrainingFolder}
                    onResultsUpdate={handleTrainingResultsUpdate}
                />
            );
        }
        return null;
    }, [selectedTrainingFolder]); // Only re-render if the selectedTrainingFolder changes

    return (
        <div className="detection-container">
            <div className="detection-controls">
                {!fileKey && (
                    <>
                        <ModelSelector onSuccess={handleModelSetSuccess} />
                        <FileUpload onFileUploaded={handleFileUpload} />
                        <button className="toggle-chat-button" onClick={toggleChatVisibility}>
                            {isChatVisible ? 'Hide Chat' : 'Show Chat'}
                        </button>
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
            </div>
            <div className="detection-results">
                {fileKey ? (
                    <ImageResults fileKey={fileKey} />
                ) : (
                    memoizedTrainingResults || (
                        <p>Please select a model or upload a file to start the detection process.</p>
                    )
                )}
            </div>
            <div className={`chat-container ${isChatVisible ? '' : 'chat-hidden'}`}>
                <GroqChat csvContent={csvContent} yamlContent={yamlContent} />
            </div>
        </div>
    );
};

export default Detection;
