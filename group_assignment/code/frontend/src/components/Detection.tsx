import '../css/Detection.css';
import React, { useState } from 'react';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import StartProcess from './StartProcess';
import ImageResults from './ImageResults';

const Detection: React.FC = () => {
    const [fileKey, setFileKey] = useState<string | null>(null);
    const [isImage, setIsImage] = useState<boolean>(true);

    // Handle successful model configuration
    const handleModelSetSuccess = () => {
        console.log('Model Successfully Initialized');
    };

    // Handle file upload success
    const handleFileUpload = (uploadedFileKey: string) => {
        setFileKey(uploadedFileKey);
        setIsImage(true);
    };

    // Handle restart process
    const handleRestart = () => {
        setFileKey(null);
        setIsImage(true);
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
            </div>
            <div className="detection-results">
                {fileKey ? (
                    <ImageResults fileKey={fileKey} />
                ) : (
                    <p>Please upload a file to start the detection process.</p>
                )}
            </div>
        </div>
    );
};

export default Detection;
