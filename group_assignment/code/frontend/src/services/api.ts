// src/services/api.ts

import axios from 'axios';
import { ListModelsResponse, SetModelsPayload } from '../types/models';

// Set the base URL for the backend
export const BASE_URL = 'http://127.0.0.1:5000';

// Fetch the available models from the backend
export const fetchModels = async (): Promise<ListModelsResponse> => {
    const response = await axios.get<ListModelsResponse>(`${BASE_URL}/list_models`);
    return response.data;
};

// Set the detection model on the server
export const setModel = async (payload: SetModelsPayload): Promise<void> => {
    await axios.post(`${BASE_URL}/set_model`, payload);
};

// Upload a file (image or video) to the server
export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('video_source', file);

    const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data.file_key;
};

// Start the detection process on the server
export const startProcess = async (fileKey: string, isImage: boolean): Promise<void> => {
    const response = await axios.post(`${BASE_URL}/start_process`, {
        file_key: fileKey,
        is_image: isImage,
    });

    if (response.status !== 200) {
        throw new Error('Failed to start the detection process');
    }
};
