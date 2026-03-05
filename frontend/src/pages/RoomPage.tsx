import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/gameStore';
import GameView from '../components/GameView';

interface PlayerInfo {
    id: string;
    name: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
    hasGuessed: boolean;
    isDrawing: boolean;
}

interface RoomSettings {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    wordCount: number;
    hintCount: number;
}

export default function RoomPage() {
    const { roomId } = useParams<{ roomId: string }>();
    const socket = useSocket();
    const navigate = useNavigate();
    const store = useGameStore();

    const [copied, setCopied] = useState(false);
    const [localSettings, setLocalSettings] = useState<RoomSettings>({
        maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hintCount: 2,
    });

    const myId = store.playerId || sessionStorage.getItem('playerId') || '';
    const isHost = store.players.find(p => p.isHost)?.id === myId;

    // ─── Wire all socket events to Zustand store ─────────────────
    useEffect(() => {
        if (!roomId) { navigate('/'); return; }

        // Attempt reconnection if we have a stored token
        const storedToken = sessionStorage.getItem('playerToken');
        const storedPlayerId = sessionStorage.getItem('playerId');
        if (storedToken && storedPlayerId) {
            store.setRoom({ roomId, roomCode: '', playerId: storedPlayerId });
            socket.emit('reconnect_player', { token: storedToken });
        }

        socket.on('game_state', (state: any) => {
            store.setGameState(state);
            if (state.settings) setLocalSettings(state.settings);
        });

        socket.on('player_joined', ({ players }: { player: PlayerInfo; players: PlayerInfo[] }) => {
            store.setPlayers(players);
        });

        socket.on('player_left', ({ players }: { playerId: string; players: PlayerInfo[] }) => {
            store.setPlayers(players);
        });

        socket.on('settings_updated', ({ settings }: { settings: RoomSettings }) => {
            store.setSettings(settings);
            setLocalSettings(settings);
        });

        socket.on('game_started', () => {
            // status will be set by round_start
        });

        socket.on('round_start', (data: any) => {
            store.setRoundStart(data);
        });

        socket.on('word_to_draw', ({ word }: { word: string }) => {
            store.setWordChosen(word);
        });

        socket.on('word_hint', ({ hint }: { hint: string }) => {
            store.setHint(hint);
        });

        socket.on('timer_update', ({ secondsRemaining }: { secondsRemaining: number }) => {
            store.setTimer(secondsRemaining);
        });

        socket.on('chat_message', (msg: any) => {
            store.addMessage(msg);
        });

        socket.on('score_update', ({ scores, leaderboard }: any) => {
            store.setScores(scores, leaderboard);
        });

        socket.on('round_end', (data: any) => {
            store.setRoundEnd(data);
        });

        socket.on('game_over', (data: any) => {
            store.setGameOver(data);
        });

        socket.on('play_again', () => {
            store.reset();
        });

        socket.on('reconnected', ({ playerId, roomCode }: any) => {
            store.setRoom({ roomId: roomId!, roomCode, playerId });
            sessionStorage.setItem('playerId', playerId);
        });

        return () => {
            socket.off('game_state');
            socket.off('player_joined');
            socket.off('player_left');
            socket.off('settings_updated');
            socket.off('game_started');
            socket.off('round_start');
            socket.off('word_to_draw');
            socket.off('word_hint');
            socket.off('timer_update');
            socket.off('chat_message');
            socket.off('score_update');
            socket.off('round_end');
            socket.off('game_over');
            socket.off('play_again');
            socket.off('reconnected');
        };
    }, [socket, roomId, navigate]);

    // ─── Game Over Screen ─────────────────────────────────────────
    if (store.gameOver) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="card max-w-lg w-full text-center">
                    <h1 className="text-5xl font-black text-yellow-300 mb-2">🏆 Game Over!</h1>
                    {store.winner && (
                        <p className="text-2xl font-bold text-orange-400 mb-6">
                            {store.winner.playerName} wins with {store.winner.points} points!
                        </p>
                    )}
                    <div className="space-y-2 mb-8">
                        {store.leaderboard.map((entry, i) => (
                            <div
                                key={entry.playerId}
                                className={`flex justify-between items-center p-3 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/40' :
                                    i === 1 ? 'bg-gray-400/20 border border-gray-400/40' :
                                        i === 2 ? 'bg-orange-700/20 border border-orange-700/40' :
                                            'bg-white/5'
                                    }`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                                    <span className="font-bold">{entry.playerName}</span>
                                </span>
                                <span className="font-black text-xl text-orange-300">{entry.points}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 justify-center">
                        {isHost && (
                            <button className="btn-primary" onClick={() => socket.emit('play_again')}>
                                🔄 Play Again
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => { store.reset(); navigate('/'); }}>
                            🏠 Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Game View ─────────────────────────────────────────────────
    if (store.status === 'playing') {
        return <GameView />;
    }

    // ─── Lobby View ────────────────────────────────────────────────
    function updateSetting<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
        if (!isHost) return;
        const updated = { ...localSettings, [key]: value };
        setLocalSettings(updated);
        socket.emit('update_settings', { settings: updated });
    }

    function copyCode() {
        navigator.clipboard.writeText(store.roomCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (store.players.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/60">Connecting to room...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-black text-orange-400">Lobby</h1>
                    <button onClick={copyCode} className="btn-secondary text-sm flex items-center gap-2">
                        <span className="font-mono tracking-widest text-yellow-300">{store.roomCode}</span>
                        <span>{copied ? ' Copied!' : ' Copy'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card">
                        <h2 className="font-bold text-white/70 text-sm uppercase tracking-wider mb-3">
                            Players ({store.players.length}/{localSettings.maxPlayers})
                        </h2>
                        <ul className="space-y-2">
                            {store.players.map(p => (
                                <li key={p.id} className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
                                    <span className="font-semibold">{p.name}</span>
                                    {p.isHost && <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full">Host</span>}
                                    {p.id === myId && <span className="text-xs text-white/40">(you)</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="card">
                        <h2 className="font-bold text-white/70 text-sm uppercase tracking-wider mb-3">Settings</h2>
                        <div className="space-y-4">
                            <SettingRow label="Rounds" value={localSettings.rounds} min={2} max={10} disabled={!isHost} onChange={v => updateSetting('rounds', v)} />
                            <SettingRow label="Draw Time (s)" value={localSettings.drawTime} min={15} max={240} step={5} disabled={!isHost} onChange={v => updateSetting('drawTime', v)} />
                            <SettingRow label="Max Players" value={localSettings.maxPlayers} min={2} max={20} disabled={!isHost} onChange={v => updateSetting('maxPlayers', v)} />
                            <SettingRow label="Hints" value={localSettings.hintCount} min={0} max={5} disabled={!isHost} onChange={v => updateSetting('hintCount', v)} />
                            <SettingRow label="Word Choices" value={localSettings.wordCount} min={1} max={5} disabled={!isHost} onChange={v => updateSetting('wordCount', v)} />
                        </div>
                    </div>
                </div>

                {isHost && (
                    <div className="mt-6 text-center">
                        <button
                            className="btn-primary text-lg px-12"
                            disabled={store.players.length < 2}
                            onClick={() => socket.emit('start_game')}
                        >
                            {store.players.length < 2 ? 'Need at least 2 players' : '🚀 Start Game'}
                        </button>
                    </div>
                )}
                {!isHost && (
                    <p className="text-center text-white/40 mt-6">Waiting for host to start the game...</p>
                )}
            </div>
        </div>
    );
}

function SettingRow({ label, value, min, max, step = 1, disabled, onChange }: {
    label: string; value: number; min: number; max: number; step?: number;
    disabled: boolean; onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/70">{label}</span>
            <div className="flex items-center gap-2">
                {!disabled && (
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center" onClick={() => onChange(Math.max(min, value - step))}>−</button>
                )}
                <span className="w-8 text-center font-bold">{value}</span>
                {!disabled && (
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center" onClick={() => onChange(Math.min(max, value + step))}>+</button>
                )}
            </div>
        </div>
    );
}
