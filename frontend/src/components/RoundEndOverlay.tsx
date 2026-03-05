import { useGameStore } from '../store/gameStore';

export default function RoundEndOverlay() {
    const showRoundEnd = useGameStore(s => s.showRoundEnd);
    const roundEndWord = useGameStore(s => s.roundEndWord);
    const leaderboard = useGameStore(s => s.leaderboard);

    if (!showRoundEnd) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card max-w-md w-full text-center">
                <h2 className="text-2xl font-black text-yellow-300 mb-1">The word was...</h2>
                <p className="text-4xl font-black text-white mb-6">{roundEndWord}</p>
                <div className="space-y-2">
                    {leaderboard.slice(0, 5).map((entry, i) => (
                        <div key={entry.playerId} className="flex justify-between text-sm">
                            <span className="text-white/70">{i + 1}. {entry.playerName}</span>
                            <span className="font-bold text-orange-300">{entry.points} pts</span>
                        </div>
                    ))}
                </div>
                <p className="text-white/30 text-xs mt-4">Next round starting soon...</p>
            </div>
        </div>
    );
}
