import { create } from 'zustand';

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

interface ChatMsg {
    playerId: string;
    playerName: string;
    text: string;
    type: 'chat' | 'guess' | 'correct' | 'system';
}

interface LeaderboardEntry {
    playerId: string;
    playerName: string;
    points: number;
}

interface GameStore {
    // Room state
    roomId: string;
    roomCode: string;
    playerId: string;
    players: PlayerInfo[];
    settings: RoomSettings;
    status: 'lobby' | 'playing' | 'ended';

    // Game state
    round: number;
    totalRounds: number;
    drawerId: string;
    isDrawer: boolean;
    wordOptions: string[];
    currentWord: string;
    hint: string;
    secondsRemaining: number;
    drawTime: number;

    // Chat
    messages: ChatMsg[];

    // Scores
    scores: Record<string, number>;
    leaderboard: LeaderboardEntry[];

    // Round end
    roundEndWord: string;
    showRoundEnd: boolean;

    // Game over
    gameOver: boolean;
    winner: LeaderboardEntry | null;

    // Actions
    setRoom: (data: { roomId: string; roomCode: string; playerId: string }) => void;
    setGameState: (state: any) => void;
    setPlayers: (players: PlayerInfo[]) => void;
    setSettings: (settings: RoomSettings) => void;
    setRoundStart: (data: any) => void;
    setWordChosen: (word: string) => void;
    setHint: (hint: string) => void;
    setTimer: (secs: number) => void;
    addMessage: (msg: ChatMsg) => void;
    setScores: (scores: Record<string, number>, leaderboard: LeaderboardEntry[]) => void;
    setRoundEnd: (data: any) => void;
    setGameOver: (data: any) => void;
    reset: () => void;
}

const initialState = {
    roomId: '',
    roomCode: '',
    playerId: '',
    players: [] as PlayerInfo[],
    settings: { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hintCount: 2 },
    status: 'lobby' as const,
    round: 0,
    totalRounds: 3,
    drawerId: '',
    isDrawer: false,
    wordOptions: [] as string[],
    currentWord: '',
    hint: '',
    secondsRemaining: 0,
    drawTime: 80,
    messages: [] as ChatMsg[],
    scores: {} as Record<string, number>,
    leaderboard: [] as LeaderboardEntry[],
    roundEndWord: '',
    showRoundEnd: false,
    gameOver: false,
    winner: null as LeaderboardEntry | null,
};

export const useGameStore = create<GameStore>((set) => ({
    ...initialState,

    setRoom: (data) => set({ roomId: data.roomId, roomCode: data.roomCode, playerId: data.playerId }),

    setGameState: (state) => set({
        players: state.players || [],
        settings: state.settings || initialState.settings,
        status: state.status || 'lobby',
        roomCode: state.code || '',
        roomId: state.id || '',
    }),

    setPlayers: (players) => set({ players }),
    setSettings: (settings) => set({ settings }),

    setRoundStart: (data) => set({
        round: data.round,
        totalRounds: data.totalRounds,
        drawerId: data.drawerId,
        isDrawer: data.isDrawer,
        wordOptions: data.wordOptions || [],
        currentWord: '',
        hint: '',
        secondsRemaining: data.drawTime,
        drawTime: data.drawTime,
        showRoundEnd: false,
        status: 'playing',
    }),

    setWordChosen: (word) => set({ currentWord: word, wordOptions: [] }),
    setHint: (hint) => set({ hint }),
    setTimer: (secs) => set({ secondsRemaining: secs }),
    addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-100), msg] })),
    setScores: (scores, leaderboard) => set({ scores, leaderboard }),

    setRoundEnd: (data) => set({
        roundEndWord: data.word,
        showRoundEnd: true,
        scores: data.cumulativeScores,
        leaderboard: data.leaderboard,
    }),

    setGameOver: (data) => set({
        gameOver: true,
        winner: data.winner,
        leaderboard: data.leaderboard,
        status: 'ended',
    }),

    reset: () => set({ ...initialState }),
}));
