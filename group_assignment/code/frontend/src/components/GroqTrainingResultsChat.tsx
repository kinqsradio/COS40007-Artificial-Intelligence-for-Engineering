import React, { useState, useEffect, useCallback } from 'react';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../css/OpenAIChat.css';
import { projectBrief, system_message, default_message } from '../prompt/prompt';

const groq = new Groq({
    apiKey: process.env.REACT_APP_GROQ_API_KEY || '',
    dangerouslyAllowBrowser: true
});

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } };
}

interface GroqChatProps {
    csvContent: string;
    yamlContent: string;
    imageData: string | null;
    imageDescription: string;
    clearImageData: () => void; // Added prop for clearing image data
}

const GroqTrainingResultsChat: React.FC<GroqChatProps> = ({ csvContent, yamlContent, imageData, imageDescription, clearImageData }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const tokenLimit = 1024;
    let typingInterval: NodeJS.Timeout;

    console.log("Using GroqTrainingResultsChat");

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const sendContentsInChunks = useCallback((csv: string, yaml: string) => {
        const csvChunks = splitIntoChunks(csv, tokenLimit);
        const yamlChunks = splitIntoChunks(yaml, tokenLimit);
        const projectBriefChunks = splitIntoChunks(projectBrief, tokenLimit);

        const initialMessages: Message[] = [
            {
                role: 'system',
                content: system_message
            }
        ];

        projectBriefChunks.forEach((chunk, index) => {
            initialMessages.push({
                role: 'system',
                content: `Project Brief chunk ${index + 1}/${projectBriefChunks.length}:\n\n${chunk}`
            });
        });

        csvChunks.forEach((chunk, index) => {
            initialMessages.push({
                role: 'system',
                content: `results.csv data chunk ${index + 1}/${csvChunks.length}:\n\n${chunk}`
            });
        });

        yamlChunks.forEach((chunk, index) => {
            initialMessages.push({
                role: 'system',
                content: `args.yaml data chunk ${index + 1}/${yamlChunks.length}:\n\n${chunk}`
            });
        });

        setMessages(initialMessages);
    }, [tokenLimit]);

    useEffect(() => {
        if (csvContent || yamlContent) {
            sendContentsInChunks(csvContent, yamlContent);
            setMessages(prevMessages => [
                ...prevMessages,
                {
                    role: 'assistant',
                    content: default_message
                }
            ]);
        }
    }, [csvContent, yamlContent, sendContentsInChunks]);

    const splitIntoChunks = (text: string, limit: number) => {
        return text.match(new RegExp(`.{1,${limit}}`, 'g')) || [];
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
            if (imageData) {
                await handleImageAndTextCompletion();
            } else {
                await handleTextCompletion(newMessages);
            }
        } catch (error) {
            console.error('Error fetching chat response:', error);
            setIsTyping(false);
        }
    };

    const handleTextCompletion = async (newMessages: Message[]) => {
        console.log('Using text models');
        const filteredMessages = newMessages.filter(msg => !(msg.role === 'user' && typeof msg.content !== 'string'));
        const completion = await groq.chat.completions.create({
            messages: filteredMessages.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            })),
            model: 'llama-3.1-70b-versatile',
            max_tokens: 1024,
        });

        const assistantContent = completion.choices[0]?.message?.content || 'No response available.';
        simulateTyping(assistantContent);
    };

    const handleImageAndTextCompletion = async () => {
        console.log('Using vision model to analyze image');
        const imageContent = `data:image/jpeg;base64,${imageData}`;

        // Add the image to the chat for the user to see
        setMessages(prevMessages => [
            ...prevMessages,
            {
                role: 'user',
                content: { type: 'image_url', image_url: { url: imageContent } }
            }
        ]);

        // Enhanced prompt for vision model to provide detailed analysis
        const visionCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Please provide a detailed analysis of the image below. You may want to extracting all the data in the image and providing a detailed analysis and description. ${imageDescription}` },
                        { type: 'image_url', image_url: { url: imageContent } }
                    ]
                }
            ],
            model: 'llama-3.2-90b-vision-preview',
            max_tokens: 1024,
        });

        const visionResult = visionCompletion.choices[0]?.message?.content || 'No response available from vision model.';

        // Forward the vision model output to the text model for further processing
        console.log('Using text model to process vision model output');
        const textCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: visionResult
                }
            ],
            model: 'llama-3.1-70b-versatile',
            max_tokens: 1024,
        });

        const finalContent = textCompletion.choices[0]?.message?.content || 'No response available.';
        simulateTyping(finalContent);

        // Clear the image data after processing
        clearImageData();
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
                    placeholder="Type your message related to the training results..."
                    disabled={isTyping}
                />
                <button type="submit" disabled={isTyping}>Send</button>
                {isTyping && <button type="button" onClick={stopTyping}>Stop</button>}
            </form>
        </div>
    );
};

export default GroqTrainingResultsChat;
