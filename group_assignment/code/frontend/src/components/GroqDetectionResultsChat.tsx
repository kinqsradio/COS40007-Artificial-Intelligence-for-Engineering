import React, { useState, useEffect } from 'react';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../css/OpenAIChat.css';
import { detection_default_message } from '../prompt/prompt';

const groq = new Groq({
    apiKey: process.env.REACT_APP_GROQ_API_KEY || '',
    dangerouslyAllowBrowser: true
});

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } };
}

interface GroqDetectionResultsChatProps {
    imageData: string | null;
    imageDescription: string;
}

const GroqDetectionResultsChat: React.FC<GroqDetectionResultsChatProps> = ({ imageData, imageDescription }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [imageAdded, setImageAdded] = useState<boolean>(false);
    let typingInterval: NodeJS.Timeout;

    console.log("Using GroqDetectionResultsChat");

    useEffect(() => {
        setMessages([
            {
                role: 'assistant',
                content: detection_default_message
            }
        ]);
    }, []);

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isTyping) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            if (imageData && !imageAdded) {
                await handleImageCompletion(); // Add the image to the chat initially
                setImageAdded(true); // Prevent re-adding the same image
            } else if (imageData) {
                await handleFollowUpAnalysis(newMessages); // For subsequent questions
            } else {
                setMessages(prevMessages => [
                    ...prevMessages,
                    { role: 'assistant', content: 'No image data available for analysis.' }
                ]);
                setIsTyping(false);
            }
        } catch (error) {
            console.error('Error fetching chat response:', error);
            setIsTyping(false);
        }
    };

    const handleImageCompletion = async () => {
        console.log('Using vision model to analyze image');

        const imageContent = `data:image/jpeg;base64,${imageData}`;
        console.log("Image content:", imageContent);

        setMessages(prevMessages => [
            ...prevMessages,
            {
                role: 'user',
                content: { type: 'image_url', image_url: { url: imageContent } }
            }
        ]);

        const customPrompt = `You are analyzing an image as part of a model detection results chat.The model is trcitly detecting rubbish and its type, here are the available class label: 'electrical goods', 'rubbish', 'mattress', 'furniture', 'toy', 'bag', 'clothes', 'electrical', 'chair'. The user may ask about the content, detected objects, or correctness of the detection results. Provide detailed explanations about the objects in the image, their locations, and any other relevant features. Consider whether the detections appear accurate based on what is visible in the image. ${imageDescription}`;

        const visionCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: customPrompt },
                        { type: 'image_url', image_url: { url: imageContent } }
                    ]
                }
            ],
            model: 'llama-3.2-90b-vision-preview',
            max_tokens: 1024,
        });

        const visionResult = visionCompletion.choices[0]?.message?.content || 'No response available from vision model.';
        simulateTyping(visionResult);
    };

    const handleFollowUpAnalysis = async (newMessages: Message[]) => {
        console.log('Analyzing follow-up questions with vision model');

        const imageContent = `data:image/jpeg;base64,${imageData}`;
        const lastUserMessage = newMessages[newMessages.length - 1].content;

        const followUpPrompt = `The user has asked a follow-up question regarding the previously analyzed image: "${lastUserMessage}". Continue analyzing the image and provide relevant insights. ${imageDescription}`;

        const followUpCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: followUpPrompt },
                        { type: 'image_url', image_url: { url: imageContent } }
                    ]
                }
            ],
            model: 'llama-3.2-90b-vision-preview',
            max_tokens: 1024,
        });

        const followUpResult = followUpCompletion.choices[0]?.message?.content || 'No further insights available.';
        simulateTyping(followUpResult);
    };

    const simulateTyping = (text: string) => {
        let index = 0;
        let currentText = '';
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '' }]);

        typingInterval = setInterval(() => {
            if (index < text.length) {
                currentText += text[index];
                setMessages(prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        return [
                            ...prevMessages.slice(0, -1),
                            { ...lastMessage, content: currentText }
                        ];
                    }
                    return prevMessages;
                });
                index++;
            } else {
                clearInterval(typingInterval);
                setIsTyping(false);
                setMessages(prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        return [
                            ...prevMessages.slice(0, -1),
                            { ...lastMessage, content: text }
                        ];
                    }
                    return prevMessages;
                });
            }
        }, 1);
    };

    const stopTyping = () => {
        clearInterval(typingInterval);
        setIsTyping(false);
    };

    return (
        <div className={`groq-chat ${isFullScreen ? 'full-screen' : ''}`}>
            <div className="chat-controls">
                <button onClick={toggleFullScreen}>
                    {isFullScreen ? 'Exit Full Screen' : 'Enlarge Chat'}
                </button>
            </div>
            <div className="chat-window">
                {messages
                    .filter(message => message.role !== 'system')
                    .map((message, index) => (
                        <div key={index} className={`chat-message ${message.role}`}>
                            <strong>{message.role === 'user' ? 'User' : 'Assistant'}:</strong>
                            {typeof message.content === 'string' ? (
                                <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            ) : message.content.type === 'image_url' && message.content.image_url ? (
                                <img src={message.content.image_url.url} alt="User provided content" className="result-image" />
                            ) : (
                                <p>{message.content.text}</p>
                            )}
                        </div>
                    ))}
                {isTyping && <div className="chat-message assistant"><strong>Assistant:</strong> <span className="typing-indicator">typing...</span></div>}
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about the detection results..."
                    disabled={isTyping}
                />
                <button type="submit" disabled={isTyping}>Send</button>
                {isTyping && <button type="button" onClick={stopTyping}>Stop</button>}
            </form>
        </div>
    );
};

export default GroqDetectionResultsChat;
