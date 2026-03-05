import { useGameStore } from '../store/gameStore';
import { useSocket } from '../context/SocketContext';

export default function WordSelector() {
    const wordOptions = useGameStore(s => s.wordOptions);
    const socket = useSocket();

    if (wordOptions.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card max-w-md w-full text-center">
                <h2 className="text-2xl font-black text-orange-400 mb-2">Choose a word!</h2>
                <p className="text-white/50 text-sm mb-6">Pick a word to draw for your team</p>
                <div className="flex flex-col gap-3">
                    {wordOptions.map(word => (
                        <button
                            key={word}
                            className="btn-primary text-lg"
                            onClick={() => socket.emit('word_chosen', { word })}
                        >
                            {word}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
