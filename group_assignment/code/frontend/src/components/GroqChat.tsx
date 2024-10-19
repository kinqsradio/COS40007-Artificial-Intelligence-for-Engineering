import React, { useState, useEffect } from 'react';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';
import '../css/OpenAIChat.css';

const groq = new Groq({
    apiKey: process.env.REACT_APP_GROQ_API_KEY || '', // Get API key from environment variable
    dangerouslyAllowBrowser: true
});

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface GroqChatProps {
    csvContent: string;
}

const GroqChat: React.FC<GroqChatProps> = ({ csvContent }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const tokenLimit = 1024; // Define the token limit for each chunk

    useEffect(() => {
        if (csvContent) {
            sendCsvContentInChunks(csvContent);
            // Add an initial assistant message to guide the user
            setMessages(prevMessages => [
                ...prevMessages,
                {
                    role: 'assistant',
                    content: 'Hi! I am here to help you answer questions related to the provided training results. You can ask me about specific metrics, patterns, or insights that you would like to understand from the data.'
                }
            ]);
        }
    }, [csvContent]);

    const sendCsvContentInChunks = (content: string) => {
        // Split content into chunks that respect the token limit
        const chunks = content.match(new RegExp(`.{1,${tokenLimit}}`, 'g')) || [];

        const initialMessages: Message[] = [
            { 
                role: 'system', 
                content: 'You are a specialized assistant designed to answer questions strictly related to the provided training results contained in the CSV file. If the user asks a question outside the scope of this data, politely redirect them to focus on the CSV content.' 
            }
        ];

        // Add each chunk as a separate system message
        chunks.forEach((chunk, index) => {
            initialMessages.push({
                role: 'system',
                content: `CSV data chunk ${index + 1}/${chunks.length}:\n\n${chunk}`
            });
        });

        setMessages(initialMessages);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const userMessage: Message = { role: 'user', content: input };
        setMessages([...messages, userMessage]);
        setInput('');

        try {
            console.log('Sending to Groq API:', [...messages, userMessage]);

            const completion = await groq.chat.completions.create({
                messages: [...messages, userMessage].map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
                model: 'llama-3.1-70b-versatile',
                max_tokens: 1024
            });

            const assistantMessage: Message = {
                role: 'assistant',
                content: completion.choices[0]?.message?.content || 'I can only answer questions related to the training results provided in the CSV.'
            };

            setMessages([...messages, userMessage, assistantMessage]);
        } catch (error) {
            console.error('Error fetching chat response:', error);
        }
    };

    return (
        <div className="groq-chat">
            <div className="chat-window">
                {messages
                    .filter(message => message.role !== 'system') // Exclude system messages from being displayed
                    .map((message, index) => (
                        <div key={index} className={`chat-message ${message.role}`}>
                            <strong>{message.role === 'user' ? 'User' : 'Assistant'}:</strong>
                            {message.role === 'assistant' ? (
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            ) : (
                                <p>{message.content}</p>
                            )}
                        </div>
                    ))}
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message related to the training results..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default GroqChat;
