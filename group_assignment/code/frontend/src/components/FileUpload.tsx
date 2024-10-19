// FileUpload.tsx
import '../css/FileUpload.css';
import React, { useState, useRef, useEffect } from 'react';
import { uploadFile } from '../services/api';

interface FileUploadProps {
    onFileUploaded: (fileKey: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isVideo, setIsVideo] = useState<boolean>(false);
    const [timeFrame, setTimeFrame] = useState<string>('0:00');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [extractedImage, setExtractedImage] = useState<string | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (filePreviewUrl) {
                URL.revokeObjectURL(filePreviewUrl);
            }
        };
    }, [filePreviewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleFileSelect = (file: File | null) => {
        setSelectedFile(file);
        setIsVideo(file?.type.startsWith('video/') || false);
        setExtractedImage(null);
        setMessage('');
        setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
        setVideoLoaded(false); // Reset video loaded state
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || (isVideo && !extractedImage)) {
            setMessage('Please select an image or extract a frame from the video first.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const fileToUpload = isVideo ? dataURLtoFile(extractedImage!, 'extracted_frame.png') : selectedFile;
            const fileKey = await uploadFile(fileToUpload);
            onFileUploaded(fileKey);
        } catch (error) {
            console.error('Failed to upload file:', error);
            setMessage('Failed to upload file.');
        } finally {
            setLoading(false);
        }
    };

    const handleExtractFrame = () => {
        if (!videoRef.current || !videoLoaded) {
            setMessage('Video is not loaded yet. Please wait until the video is ready.');
            return;
        }

        const [minute, second] = timeFrame.split(':').map(Number);
        const timeInSeconds = minute * 60 + second;
        videoRef.current.currentTime = timeInSeconds;

        videoRef.current.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current!.videoWidth;
            canvas.height = videoRef.current!.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setExtractedImage(dataUrl);
            setMessage('Frame extracted successfully.');
        };
    };

    const handleVideoLoaded = () => {
        setVideoLoaded(true);
        setMessage('Video loaded successfully. You can now extract frames.');
    };

    const dataURLtoFile = (dataUrl: string, filename: string): File => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    return (
        <div className="file-upload">
            <h2>File Upload</h2>
            <div
                className={`drag-and-drop ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <p>Drag & Drop a file here or</p>
                <label className="upload-label" htmlFor="file-input">Choose a File</label>
                <input id="file-input" type="file" onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            {filePreviewUrl && (
                <div className="file-preview">
                    <h3>File Preview:</h3>
                    {isVideo ? (
                        <video
                            ref={videoRef}
                            src={filePreviewUrl}
                            controls
                            onLoadedData={handleVideoLoaded}
                            width="300"
                        />
                    ) : (
                        <img src={filePreviewUrl} alt="Selected File" width="300" />
                    )}
                </div>
            )}
            {isVideo && (
                <div className="video-controls">
                    <label>
                        Timeframe (minute:second):
                        <input
                            type="text"
                            value={timeFrame}
                            onChange={(e) => setTimeFrame(e.target.value)}
                            placeholder="0:00"
                        />
                    </label>
                    <button onClick={handleExtractFrame} disabled={loading || !selectedFile}>
                        {loading ? 'Extracting...' : 'Extract Frame'}
                    </button>
                </div>
            )}
            {extractedImage && (
                <div className="extracted-frame">
                    <h3>Extracted Frame:</h3>
                    <img src={extractedImage} alt="Extracted Frame" />
                </div>
            )}
            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload File'}
            </button>
            {message && <p className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</p>}
        </div>
    );
};

export default FileUpload;
