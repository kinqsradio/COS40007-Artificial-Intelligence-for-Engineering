import '../css/ImageResults.css';
import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ImageResultsProps {
    fileKey: string;
}

const ImageResults: React.FC<ImageResultsProps> = ({ fileKey }) => {
    const frameCanvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        socketRef.current = io('http://127.0.0.1:5000', {
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket server');
            socketRef.current?.emit('join', { file_key: fileKey });
        });

        socketRef.current.on('frame', (data) => {
            displayFrame(data.data, frameCanvasRef);
        });

        socketRef.current.on('detection_frame', (data) => {
            displayFrame(data.data, detectionCanvasRef);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [fileKey]);

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
        <div className="image-results">
            <h3>Image Results</h3>
            <div className="frames-container">
                <div className="frame-card">
                    <h4>Original Frame</h4>
                    <canvas ref={frameCanvasRef} width="1270" height="720"></canvas>
                </div>
                <div className="frame-card">
                    <h4>Detection Frame</h4>
                    <canvas ref={detectionCanvasRef} width="1270" height="720"></canvas>
                </div>
            </div>
        </div>
    );
};

export default ImageResults;
