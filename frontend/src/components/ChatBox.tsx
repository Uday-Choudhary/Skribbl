import { useState, useRef, useEffect, FormEvent } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/gameStore';

export default function ChatBox() {
    const socket = useSocket();
    const messages = useGameStore(s => s.messages);
    const isDrawer = useGameStore(s => s.isDrawer);
    const playerId = useGameStore(s => s.playerId);
    const [text, setText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    function handleSend(e: FormEvent) {
        e.preventDefault();
        if (!text.trim()) return;

        if (isDrawer) {
            socket.emit('chat', { text: text.trim() });
        } else {
            socket.emit('guess', { text: text.trim() });
        }
        setText('');
    }

    function getMsgStyle(msg: typeof messages[0]) {
        if (msg.type === 'correct') return 'text-green-400 font-bold';
        if (msg.type === 'system') return 'text-yellow-300 italic';
        if (msg.playerId === playerId) return 'text-white';
        return 'text-white/80';
    }

    return (
        <div className="card !p-0 flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 font-bold text-sm text-white/60 uppercase tracking-wider">
                Chat
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm min-h-[150px] max-h-[300px]">
                {messages.map((msg, i) => (
                    <div key={i} className={getMsgStyle(msg)}>
                        {msg.type === 'correct' ? (
                            <span>✅ {msg.text}</span>
                        ) : msg.type === 'system' ? (
                            <span>💬 {msg.text}</span>
                        ) : (
                            <span>
                                <span className="font-semibold text-orange-300">{msg.playerName}: </span>
                                {msg.text}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSend} className="flex border-t border-white/10">
                <input
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
                    placeholder={isDrawer ? 'Type a message...' : 'Type your guess...'}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={100}
                />
                <button type="submit" className="px-4 text-orange-400 font-bold hover:text-orange-300 transition-colors">
                    Send
                </button>
            </form>
        </div>
    );
}
