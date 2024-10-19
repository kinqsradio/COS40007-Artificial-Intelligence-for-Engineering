import React, { useState, useEffect } from 'react';
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
    content: string;
}

interface GroqChatProps {
    csvContent: string;
    yamlContent: string;
}

const GroqChat: React.FC<GroqChatProps> = ({ csvContent, yamlContent }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false); // State to control full-screen mode
    const tokenLimit = 1024; // Define the token limit for each chunk
    let typingInterval: NodeJS.Timeout;

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen); // Toggle full-screen state
    };

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
    }, [csvContent, yamlContent]);

    const sendContentsInChunks = (csv: string, yaml: string) => {
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
    };

    const splitIntoChunks = (text: string, limit: number) => {
        return text.match(new RegExp(`.{1,${limit}}`, 'g')) || [];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isTyping) return; // Prevent submitting while the assistant is typing

        const userMessage: Message = { role: 'user', content: input };
        setMessages([...messages, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const completion = await groq.chat.completions.create({
                messages: [...messages, userMessage].map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
                model: 'llama-3.1-70b-versatile',
                max_tokens: 1024
            });

            const assistantContent = completion.choices[0]?.message?.content || 'I can only answer questions related to the training results provided in the CSV and YAML files.';
            simulateTyping(assistantContent);
        } catch (error) {
            console.error('Error fetching chat response:', error);
            setIsTyping(false);
        }
    };

    const simulateTyping = (text: string) => {
        let index = 0;
        let currentText = '';
        setMessages(prevMessages => [
            ...prevMessages,
            { role: 'assistant', content: '' }
        ]);

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
            }
        }, 1); // Typing speed in milliseconds per character
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
                            {message.role === 'assistant' ? (
                                <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            ) : (
                                <p>{message.content}</p>
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
                    disabled={isTyping} // Disable input while typing
                />
                <button type="submit" disabled={isTyping}>Send</button>
                {isTyping && <button type="button" onClick={stopTyping}>Stop</button>}
            </form>
        </div>
    );
};

export default GroqChat;
