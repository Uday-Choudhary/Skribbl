import { useGameStore } from '../store/gameStore';

export default function Scoreboard() {
    const players = useGameStore(s => s.players);
    const scores = useGameStore(s => s.scores);
    const drawerId = useGameStore(s => s.drawerId);
    const playerId = useGameStore(s => s.playerId);

    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

    return (
        <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 font-bold text-sm text-white/60 uppercase tracking-wider">
                Leaderboard
            </div>
            <ul className="divide-y divide-white/5">
                {sorted.map((p, i) => (
                    <li
                        key={p.id}
                        className={`flex items-center justify-between px-4 py-2 text-sm ${p.id === drawerId ? 'bg-orange-500/10' : ''
                            } ${!p.isConnected ? 'opacity-40' : ''}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-white/40 w-5 font-mono">{i + 1}.</span>
                            <span className="font-semibold">{p.name}</span>
                            {p.id === drawerId && <span className="text-xs">🎨</span>}
                            {p.id === playerId && <span className="text-xs text-white/40">(you)</span>}
                            {p.hasGuessed && <span className="text-xs text-green-400">✓</span>}
                        </div>
                        <span className="font-bold text-orange-300">{scores[p.id] || 0}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
