import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

export default function LandingPage() {
    const socket = useSocket();
    const navigate = useNavigate();

    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState<'create' | 'join' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function validate(): boolean {
        if (playerName.trim().length < 2) {
            setError('Name must be at least 2 characters');
            return false;
        }
        if (playerName.trim().length > 20) {
            setError('Name must be at most 20 characters');
            return false;
        }
        return true;
    }

    function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setError('');

        socket.emit('create_room', { playerName: playerName.trim() });

        socket.once('room_created', ({ roomId, playerId, token }: { roomId: string; playerId: string; token: string }) => {
            sessionStorage.setItem('playerId', playerId);
            sessionStorage.setItem('playerToken', token);
            sessionStorage.setItem('playerName', playerName.trim());
            navigate(`/room/${roomId}`);
        });

        socket.once('error', ({ message }: { message: string }) => {
            setError(message);
            setLoading(false);
        });
    }

    function handleJoin(e: FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        if (!roomCode.trim()) { setError('Enter a room code'); return; }
        setLoading(true);
        setError('');

        // First resolve room ID from code
        fetch(`/rooms/code/${roomCode.trim().toUpperCase()}`)
            .then(r => r.json())
            .then(room => {
                if (room.error) { setError(room.error); setLoading(false); return; }
                socket.emit('join_room', { roomId: room.id, playerName: playerName.trim() });

                socket.once('room_joined', ({ roomId, playerId, token }: { roomId: string; playerId: string; token: string }) => {
                    sessionStorage.setItem('playerId', playerId);
                    sessionStorage.setItem('playerToken', token);
                    sessionStorage.setItem('playerName', playerName.trim());
                    navigate(`/room/${roomId}`);
                });

                socket.once('error', ({ message }: { message: string }) => {
                    setError(message);
                    setLoading(false);
                });
            })
            .catch(() => { setError('Could not reach server'); setLoading(false); });
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Hero */}
            <div className="text-center mb-10">
                <h1 className="text-6xl font-black tracking-tight mb-2">
                    <span className="text-orange-400">Skr</span>
                    <span className="text-pink-400">ibbl</span>
                    <span className="text-yellow-300">!</span>
                </h1>
                <p className="text-white/60 text-lg">Draw. Guess. Laugh. Repeat.</p>
            </div>

            {/* Card */}
            <div className="card w-full max-w-md">
                {error && (
                    <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-4 py-2 mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Name input always visible */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-white/70 mb-1">Your Name</label>
                    <input
                        className="input-field"
                        placeholder="Enter your name..."
                        value={playerName}
                        maxLength={20}
                        onChange={e => setPlayerName(e.target.value)}
                    />
                </div>

                {mode === null && (
                    <div className="flex flex-col gap-3">
                        <button className="btn-primary" onClick={() => setMode('create')}>
                            🎨 Create Room
                        </button>
                        <button className="btn-secondary" onClick={() => setMode('join')}>
                            🚪 Join Room
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <form onSubmit={handleCreate} className="flex flex-col gap-3">
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : '🎨 Create & Enter Room'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setMode(null)}>Back</button>
                    </form>
                )}

                {mode === 'join' && (
                    <form onSubmit={handleJoin} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-white/70 mb-1">Room Code</label>
                            <input
                                className="input-field uppercase tracking-widest"
                                placeholder="XXXXXX"
                                value={roomCode}
                                maxLength={6}
                                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Joining...' : '🚪 Join Room'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setMode(null)}>Back</button>
                    </form>
                )}
            </div>

            <p className="mt-8 text-white/30 text-sm">No account needed · Up to 20 players per room</p>
        </div>
    );
}
