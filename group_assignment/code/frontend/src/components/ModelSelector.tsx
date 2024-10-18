import '../css/ModelSelector.css';
import React, { useEffect, useState } from 'react';
import { fetchModels, setModels } from '../services/api';
import { ListModelsResponse } from '../types/models';

interface ModelSelectorProps {
    onSuccess: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSuccess }) => {
    const [detectionModels, setDetectionModels] = useState<string[]>([]);
    const [selectedDetectionModel, setSelectedDetectionModel] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    // Fetch available models on component mount
    useEffect(() => {
        async function loadModels() {
            try {
                const models: ListModelsResponse = await fetchModels();
                setDetectionModels(models.detection_models);
                setSelectedDetectionModel(models.detection_models[0] || '');
            } catch (error) {
                console.error('Failed to fetch models', error);
            }
        }

        loadModels();
    }, []);

    // Set models automatically whenever a model selection changes
    useEffect(() => {
        if (selectedDetectionModel) {
            setModelConfiguration();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDetectionModel]);

    const setModelConfiguration = async () => {
        setLoading(true);

        try {
            await setModels({
                yolo: selectedDetectionModel,
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to set models', error);
        } finally {
            setLoading(false);
        }
    };

    // ModelSelector.tsx
    return (
        <div className="model-selector">
            <h2>Model Selector</h2>
            <div>
                <label>Detection Model:</label>
                <select
                    value={selectedDetectionModel}
                    onChange={(e) => setSelectedDetectionModel(e.target.value)}
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
