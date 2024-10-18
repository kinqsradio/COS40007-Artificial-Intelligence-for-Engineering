// src/components/ImageResults.tsx
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ImageResultsProps {
    fileKey: string;
}

const ImageResults: React.FC<ImageResultsProps> = ({ fileKey }) => {
    const frameCanvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket | null>(null);

    const [detectionResults, setDetectionResults] = useState<any>(null);

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io('http://127.0.0.1:5000', {
            transports: ['websocket'],
        });

        // Join the fileKey room
        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket server');
            socketRef.current?.emit('join', { file_key: fileKey });
        });

        // Listen for frame events
        socketRef.current.on('frame', (data) => {
            displayFrame(data.data, frameCanvasRef);
        });

        socketRef.current.on('detection_frame', (data) => {
            displayFrame(data.data, detectionCanvasRef);
        });


        // Listen for JSON results
        socketRef.current.on('detection_results_json', (data) => {
            setDetectionResults(data.data);
        });


        // Clean up when component unmounts
        return () => {
            socketRef.current?.disconnect();
        };
    }, [fileKey]);

    // Function to display a frame on a canvas
    const displayFrame = (base64Data: string, canvasRef: React.RefObject<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Data}`;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
    };

    return (
        <div>
            <h3>Image Results</h3>
            <div>
                <h4>Original Frame</h4>
                <canvas ref={frameCanvasRef} width="640" height="400"></canvas>
            </div>
            <div>
                <h4>Detection Frame</h4>
                <canvas ref={detectionCanvasRef} width="640" height="400"></canvas>
            </div>
            <div>
                <h4>Detection Results JSON</h4>
                <pre>{detectionResults ? JSON.stringify(detectionResults, null, 2) : 'No detection results received yet.'}</pre>
            </div>
        </div>
    );
};

export default ImageResults;
