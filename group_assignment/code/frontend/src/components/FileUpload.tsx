import React, { useState, useRef } from 'react';
import { uploadFile } from '../services/api';

interface FileUploadProps {
    onFileUploaded: (fileKey: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isVideo, setIsVideo] = useState<boolean>(false);
    const [timeFrame, setTimeFrame] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [extractedImage, setExtractedImage] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        setIsVideo(file?.type.startsWith('video/') || false);
        setExtractedImage(null);
        setMessage('');
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
        if (!videoRef.current) {
            setMessage('Video is not loaded.');
            return;
        }

        videoRef.current.currentTime = timeFrame;
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

    // Utility function to convert a data URL to a File object
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
        <div>
            <h2>File Upload</h2>
            <input type="file" onChange={handleFileChange} accept="image/*,video/*" />
            {isVideo && (
                <div>
                    <label>
                        Timeframe (in seconds):
                        <input
                            type="number"
                            value={timeFrame}
                            onChange={(e) => setTimeFrame(Number(e.target.value))}
                        />
                    </label>
                    <button onClick={handleExtractFrame} disabled={loading || !selectedFile}>
                        {loading ? 'Extracting...' : 'Extract Frame'}
                    </button>
                    <video ref={videoRef} src={selectedFile ? URL.createObjectURL(selectedFile) : ''} hidden />
                </div>
            )}
            {extractedImage && (
                <div>
                    <h3>Extracted Frame:</h3>
                    <img src={extractedImage} alt="Extracted Frame" style={{ maxWidth: '100%' }} />
                </div>
            )}
            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload File'}
            </button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default FileUpload;
