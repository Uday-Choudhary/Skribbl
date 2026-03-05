import { useGameStore } from '../store/gameStore';
import Canvas from './Canvas';
import ChatBox from './ChatBox';
import Scoreboard from './Scoreboard';
import WordSelector from './WordSelector';
import RoundEndOverlay from './RoundEndOverlay';

export default function GameView() {
    const round = useGameStore(s => s.round);
    const totalRounds = useGameStore(s => s.totalRounds);
    const secondsRemaining = useGameStore(s => s.secondsRemaining);
    const hint = useGameStore(s => s.hint);
    const currentWord = useGameStore(s => s.currentWord);
    const isDrawer = useGameStore(s => s.isDrawer);
    const drawerId = useGameStore(s => s.drawerId);
    const players = useGameStore(s => s.players);

    const drawerName = players.find(p => p.id === drawerId)?.name || '???';

    return (
        <div className="min-h-screen p-4">
            {/* Word selector overlay */}
            <WordSelector />
            {/* Round end overlay */}
            <RoundEndOverlay />

            {/* Top bar */}
            <div className="max-w-7xl mx-auto mb-4">
                <div className="card !p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-white/50">Round <span className="font-bold text-white">{round}/{totalRounds}</span></span>
                        <span className="text-sm text-white/50">
                            {isDrawer ? 'You are drawing!' : <><span className="font-semibold text-orange-300">{drawerName}</span> is drawing</>}
                        </span>
                    </div>
                    <div className="font-mono text-2xl tracking-widest text-yellow-300">
                        {isDrawer ? currentWord : hint || '_ _ _ _ _'}
                    </div>
                    <div className={`text-2xl font-black ${secondsRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        {secondsRemaining}s
                    </div>
                </div>
            </div>

            {/* Main game layout */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                <div>
                    <Canvas />
                </div>
                <div className="flex flex-col gap-4">
                    <Scoreboard />
                    <ChatBox />
                </div>
            </div>
        </div>
    );
}
