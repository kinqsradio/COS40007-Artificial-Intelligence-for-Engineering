import '../css/ModelSelector.css';
import React, { useEffect, useState, useCallback } from 'react';
import { setModel, fetchModels } from '../services/api';
import { ListModelsResponse, SetModelsPayload } from '../types/models';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../services/api';


interface ModelSelectorProps {
    onSuccess: (modelPath: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSuccess }) => {
    const [detectionModels, setDetectionModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [configuredModel, setConfiguredModel] = useState<string | null>(null);
    const socketRef = React.useRef<Socket | null>(null);

    // Fetch available models on component mount
    useEffect(() => {
        async function loadModels() {
            try {
                const models: ListModelsResponse = await fetchModels();
                setDetectionModels(models.detection_models);
    
                // Only set the default model if no model is selected
                if (!configuredModel && models.detection_models.length > 0) {
                    const firstModel = models.detection_models[0];
                    setSelectedModel(firstModel); // Automatically select the first model
                    await setModelConfiguration(firstModel); // Configure the first model
                }
            } catch (error) {
                console.error('Failed to fetch models', error);
            }
        }
    
        loadModels();
    
        // Establish WebSocket connection
        socketRef.current = io(BASE_URL, {
            transports: ['websocket'],
        });
    
        return () => {
            // Clean up WebSocket connection on component unmount
            socketRef.current?.disconnect();
        };
    }, [configuredModel]);
    

    // Configure the selected model when it changes and is different from the current configuration
    useEffect(() => {
        if (selectedModel && selectedModel !== configuredModel) {
            setModelConfiguration(selectedModel);
        }
    }, [selectedModel, configuredModel]);

    // Function to set the selected model using the setModel API
    const setModelConfiguration = useCallback(async (modelPath: string) => {
        setLoading(true);

        try {
            const payload: SetModelsPayload = { yolo: modelPath };
            await setModel(payload); // Call the setModel API with the selected model
            console.log('Model set successfully:', modelPath);
            setConfiguredModel(modelPath); // Update the configured model state
            onSuccess(modelPath);
            requestTrainingResults();
        } catch (error) {
            console.error('Failed to set model:', error);
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    // Function to request training results via WebSocket
    const requestTrainingResults = useCallback(() => {
        if (socketRef.current && selectedModel) {
            const trainingFolder = selectedModel.split('/')[0];

            // Emit the 'request_training_results' event
            socketRef.current.emit('request_training_results', { training_folder: trainingFolder });

            // Listen for the 'training_results' response
            socketRef.current.off('training_results').on('training_results', (data: { training_folder: string; results: any }) => {
                if (data.training_folder === trainingFolder) {
                    console.log('Received training results:', data);
                    onSuccess(selectedModel);
                }
            });

            // Handle potential errors
            socketRef.current.off('training_results_error').on('training_results_error', (error) => {
                console.error('Error fetching training results:', error);
            });
        }
    }, [selectedModel, onSuccess]);

    return (
        <div className="model-selector">
            <h2>Model Selector</h2>
            <div>
                <label>Detection Model:</label>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={loading}
                >
                    {detectionModels.map((model, index) => (
                        <option key={index} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
            </div>
            {loading && <div className="loading-indicator">Loading...</div>}
        </div>
    );
};

export default ModelSelector;
