import '../css/TrainingResults.css';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../services/api';

interface TrainingResultsProps {
    trainingFolder: string;
    onResultsUpdate: (results: { [key: string]: any }) => void;
    onExplainImage: (imageData: string, description: string) => void; // Added this prop for explaining images
}

interface TrainingResult {
    type: 'image' | 'text';
    data: string;
}

const TrainingResults: React.FC<TrainingResultsProps> = ({ trainingFolder, onResultsUpdate, onExplainImage }) => {
    const [results, setResults] = useState<{ [key: string]: TrainingResult }>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [fullscreenItem, setFullscreenItem] = useState<TrainingResult | null>(null);
    const [attachedImage, setAttachedImage] = useState<string | null>(null); // Track the attached image
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (trainingFolder === 'None' || trainingFolder === '') {
            setLoading(false);
            return;
        }

        setResults({});
        setLoading(true);

        if (!socketRef.current) {
            socketRef.current = io(BASE_URL, {
                transports: ['websocket'],
            });
        }

        socketRef.current.emit('request_training_results', { training_folder: trainingFolder });

        socketRef.current.on('training_results', (data: { training_folder: string; results: { [key: string]: TrainingResult } }) => {
            if (data.training_folder === trainingFolder) {
                setResults(data.results);
                onResultsUpdate(data.results); // Notify parent component with the new data
                setLoading(false);
            } else {
                console.warn('Received training results for a different folder:', data.training_folder);
            }
        });

        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [trainingFolder, onResultsUpdate]);

    const handleAttachImage = (file: string, imageData: string) => {
        if (attachedImage === file) {
            // If the same image is clicked again, detach it
            setAttachedImage(null);
            onExplainImage('', ''); // Remove image
        } else {
            // Attach the new image and update the state
            setAttachedImage(file);
            onExplainImage(imageData, file); // Add image
        }
    };

    const renderCsvAsTable = (csvData: string, isFullscreen: boolean = false) => {
        const rows = csvData.trim().split('\n').map(row => row.split(','));
        const limitedRows = rows.slice(1, 11);
        const allRows = rows.slice(1);

        return (
            <div className={`csv-table-container ${isFullscreen ? 'fullscreen-csv-table-container' : ''}`}>
                <table className={`${isFullscreen ? 'fullscreen-csv-table' : 'csv-table'}`}>
                    <thead>
                        <tr>
                            {rows[0].map((header, idx) => (
                                <th key={idx}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(isFullscreen ? allRows : limitedRows).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const groupedResults = {
        "Labels": ["labels.jpg", "labels_correlogram.jpg"],
        "Curves": ["F1_curve.png", "PR_curve.png", "P_curve.png", "R_curve.png"],
        "Confusion Matrices": ["confusion_matrix.png", "confusion_matrix_normalized.png"],
        "Training Batches": ["train_batch0.jpg", "train_batch1.jpg", "train_batch2.jpg"],
        "Validation Batches": ["val_batch0_labels.jpg", "val_batch0_pred.jpg"],
        "Training Configs": ["args.yaml"],
        "CSV": ["results.csv"],
    };

    const renderGroupedResults = () => {
        return Object.entries(groupedResults).map(([group, files]) => (
            <div key={group} className="result-group">
                <h4>{group}</h4>
                <div className="result-items">
                    {files.map(file => {
                        const result = results[file];
                        if (!result) {
                            console.warn(`File not found in results: ${file}`);
                            return null;
                        }

                        return (
                            <div key={file} className="result-item" onClick={() => setFullscreenItem(result)}>
                                {result.type === 'image' ? (
                                    <div>
                                        <img src={`data:image/jpeg;base64,${result.data}`} alt={file} className="result-image" />
                                        <button onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering fullscreen view
                                            handleAttachImage(file, result.data);
                                        }}>
                                            {attachedImage === file ? 'Attached' : 'Attach Image'}
                                        </button>
                                    </div>
                                ) : file.endsWith('.csv') ? (
                                    renderCsvAsTable(result.data)
                                ) : (
                                    <pre className="result-text">{result.data}</pre>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ));
    };

    const renderFullscreenModal = () => {
        if (!fullscreenItem) return null;

        return (
            <div className="fullscreen-modal" onClick={() => setFullscreenItem(null)}>
                {fullscreenItem.type === 'image' ? (
                    <img src={`data:image/jpeg;base64,${fullscreenItem.data}`} alt="Full-screen" className="fullscreen-content" />
                ) : (
                    <div className="fullscreen-content">
                        {fullscreenItem.type === 'text' ? (
                            renderCsvAsTable(fullscreenItem.data, true)
                        ) : (
                            <pre className="fullscreen-text">{fullscreenItem.data}</pre>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="training-results">
            <h3>Training Results for {trainingFolder}</h3>
            <div className="results-container">
                {loading ? (
                    <p className="loading-message">Loading training results...</p>
                ) : Object.keys(results).length === 0 ? (
                    <p className="no-results">No training results available. Please wait or choose a different folder.</p>
                ) : (
                    renderGroupedResults()
                )}
            </div>
            {renderFullscreenModal()}
        </div>
    );
};

export default TrainingResults;
