// src/components/Detection.tsx

import React, { useState } from 'react';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import StartProcess from './StartProcess';
import ImageResults from './ImageResults';

const Detection: React.FC = () => {
    const [fileKey, setFileKey] = useState<string | null>(null);
    const [isImage, setIsImage] = useState<boolean>(true);
    const [message, setMessage] = useState<string>('');

    // Handle successful model configuration
    const handleModelSetSuccess = () => {
        setMessage('Models were set successfully.');
    };

    // Handle file upload success
    const handleFileUpload = (uploadedFileKey: string) => {
        setFileKey(uploadedFileKey);
        setIsImage(true);
        setMessage('File uploaded successfully.');
    };

    return (
        <div>
            <h1>Detection Setup</h1>
            <ModelSelector onSuccess={handleModelSetSuccess} />
            <FileUpload onFileUploaded={handleFileUpload} />
            {fileKey && (
                <>
                    <StartProcess fileKey={fileKey} isImage={isImage} />
                    <ImageResults fileKey={fileKey} />
                </>
            )}
            {message && <p>{message}</p>}
        </div>
    );
};

export default Detection;
