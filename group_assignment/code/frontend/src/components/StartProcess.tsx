import '../css/StartProcess.css';
import React, { useState } from 'react';
import { startProcess } from '../services/api';

interface StartProcessProps {
    fileKey: string | null;
    isImage: boolean;
}

const StartProcess: React.FC<StartProcessProps> = ({ fileKey, isImage }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    const handleStartProcess = async () => {
        if (!fileKey) {
            setMessage('Please upload a file first.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            await startProcess(fileKey, isImage);
            setMessage('Detection process started successfully.');
        } catch (error) {
            console.error('Failed to start the detection process:', error);
            setMessage('Failed to start the detection process.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="start-process">
            <h2>Start Detection Process</h2>
            <button onClick={handleStartProcess} disabled={loading}>
                {loading ? 'Starting...' : 'Start Process'}
            </button>
            {loading && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>Loading...</span>
                </div>
            )}
            {message && <p className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</p>}
        </div>
    );
};

export default StartProcess;