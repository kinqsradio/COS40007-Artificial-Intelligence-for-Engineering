import '../css/ImageResults.css';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../services/api';


interface ImageResultsProps {
    fileKey: string;
    onImageData: (imageData: string, description: string) => void;
}

const ImageResults: React.FC<ImageResultsProps> = ({ fileKey, onImageData }) => {
    const frameCanvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);

    useEffect(() => {
        // Initialize the socket connection
        socketRef.current = io(BASE_URL, {
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket server');
            socketRef.current?.emit('join', { file_key: fileKey });
        });

        // Handle the incoming frame and detection frame data
        socketRef.current.on('frame', (data) => {
            displayFrame(data.data, frameCanvasRef);
        });

        socketRef.current.on('detection_frame', (data) => {
            displayFrame(data.data, detectionCanvasRef);
        });

        // Clean up the socket connection on component unmount
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

    // Function to extract Base64 data from a canvas and send it using the onImageData callback
    const handleAttachImage = (canvasRef: React.RefObject<HTMLCanvasElement>, description: string) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        // Get the image data URL from the canvas
        const imageDataURL = canvas.toDataURL('image/jpeg');
        const base64Data = imageDataURL.split(',')[1]; // Extract the Base64 data without the prefix

        // Attach the new image and update the state
        setAttachedImage(description);
        onImageData(base64Data, description);
    };

    // Function to close the modal
    const closeModal = () => {
        setEnlargedImage(null);
    };

    return (
        <div className="image-results">
            <h3>Image Results</h3>
            <div className="frames-container">
                <div className="frame-card">
                    <h4>Original Frame</h4>
                    <canvas
                        ref={frameCanvasRef}
                        width="1270"
                        height="720"
                    ></canvas>
                </div>
                <div className="frame-card">
                    <h4>Detection Frame</h4>
                    <canvas
                        ref={detectionCanvasRef}
                        width="1270"
                        height="720"
                    ></canvas>
                    <button
                        onClick={() => handleAttachImage(detectionCanvasRef, 'Detection Frame')}
                        className="attach-button"
                    >
                        Ask A.I
                    </button>
                </div>
            </div>

            {/* Modal for enlarged image */}
            {enlargedImage && (
                <div className="modal" onClick={closeModal}>
                    <span className="close-button">&times;</span>
                    <img src={enlargedImage} alt="Enlarged" className="modal-content" />
                </div>
            )}
        </div>
    );
};

export default ImageResults;
