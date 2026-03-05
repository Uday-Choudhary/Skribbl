"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const WordService_1 = require("./WordService");
const MAX_POINTS = 500;
const FLOOR_POINTS = 50;
const FIRST_GUESSER_BONUS = 100;
class Game {
    constructor(io, room) {
        this.io = io;
        this.room = room;
        this.roomId = room.id;
        this.totalRounds = room.settings.rounds;
        this.drawTime = room.settings.drawTime;
        this.hintCount = room.settings.hintCount;
        this.wordCount = room.settings.wordCount;
        this.round = 0;
        this.currentTurnIndex = -1;
        this.currentDrawerIndex = 0;
        this.currentWord = '';
        this.currentHint = '';
        this.revealedIndices = new Set();
        this.strokes = [];
        this.roundStartTime = 0;
        this.timerHandle = null;
        this.hintHandle = null;
        this.wordSelectionTimeout = null;
        this.scores = {};
        this.correctGuessers = 0;
        this.wordService = new WordService_1.WordService();
        this.pendingWordOptions = [];
        // Build turn order from current players
        const playerIds = Array.from(room.players.keys());
        this.turnOrder = this.shuffleArray(playerIds);
        // Initialize scores
        for (const id of playerIds) {
            this.scores[id] = 0;
        }
    }
    shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    get currentDrawerId() {
        return this.turnOrder[this.currentDrawerIndex];
    }
    get totalTurns() {
        return this.totalRounds * this.turnOrder.length;
    }
    /** Start the next turn. Returns true if game continues, false if game over */
    nextTurn() {
        this.currentTurnIndex++;
        if (this.currentTurnIndex >= this.totalTurns) {
            return false; // game over
        }
        this.currentDrawerIndex = this.currentTurnIndex % this.turnOrder.length;
        this.round = Math.floor(this.currentTurnIndex / this.turnOrder.length) + 1;
        // Reset round state
        this.strokes = [];
        this.currentWord = '';
        this.currentHint = '';
        this.revealedIndices = new Set();
        this.correctGuessers = 0;
        this.clearTimers();
        // Reset player round state
        for (const player of this.room.players.values()) {
            player.resetRound();
        }
        const drawer = this.room.players.get(this.currentDrawerId);
        if (drawer)
            drawer.isDrawing = true;
        return true;
    }
    /** Send word options to the drawer and store them for validation */
    sendWordOptions() {
        this.pendingWordOptions = this.wordService.getWords(this.wordCount);
        return this.pendingWordOptions;
    }
    /** Validate that the chosen word was in the offered options */
    isValidWordChoice(word) {
        return this.pendingWordOptions.includes(word);
    }
    /** Set the chosen word and build the initial hint */
    setWord(word) {
        this.currentWord = word;
        this.pendingWordOptions = []; // clear after selection
        this.clearWordSelectionTimeout();
        this.buildHint();
    }
    /** Clear the 15-second word selection timeout */
    clearWordSelectionTimeout() {
        if (this.wordSelectionTimeout) {
            clearTimeout(this.wordSelectionTimeout);
            this.wordSelectionTimeout = null;
        }
    }
    buildHint() {
        // Reveal spaces and punctuation immediately
        const hint = this.currentWord
            .split('')
            .map((ch, i) => {
            if (ch === ' ' || ch === '-' || ch === "'")
                return ch;
            if (this.revealedIndices.has(i))
                return ch;
            return '_';
        })
            .join(' ');
        this.currentHint = hint;
    }
    /** Reveal one random letter as a hint */
    revealHint() {
        const indices = [];
        for (let i = 0; i < this.currentWord.length; i++) {
            const ch = this.currentWord[i];
            if (ch !== ' ' && ch !== '-' && ch !== "'" && !this.revealedIndices.has(i)) {
                indices.push(i);
            }
        }
        if (indices.length === 0)
            return this.currentHint;
        const idx = indices[Math.floor(Math.random() * indices.length)];
        this.revealedIndices.add(idx);
        this.buildHint();
        return this.currentHint;
    }
    /** Start the round timer and hint scheduler */
    startTimer(onTimerTick, onTimerEnd) {
        this.roundStartTime = Date.now();
        let secondsRemaining = this.drawTime;
        this.timerHandle = setInterval(() => {
            secondsRemaining--;
            onTimerTick(secondsRemaining);
            if (secondsRemaining <= 0) {
                this.clearTimers();
                onTimerEnd();
            }
        }, 1000);
        // Hint scheduler
        if (this.hintCount > 0) {
            const hintInterval = (this.drawTime / (this.hintCount + 1)) * 1000;
            let hintsGiven = 0;
            this.hintHandle = setInterval(() => {
                hintsGiven++;
                if (hintsGiven <= this.hintCount) {
                    const hint = this.revealHint();
                    this.io.to(this.roomId).emit('word_hint', { hint });
                }
                if (hintsGiven >= this.hintCount && this.hintHandle) {
                    clearInterval(this.hintHandle);
                }
            }, hintInterval);
        }
    }
    clearTimers() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
        if (this.hintHandle) {
            clearInterval(this.hintHandle);
            this.hintHandle = null;
        }
        this.clearWordSelectionTimeout();
    }
    /** Evaluate a guess. Returns points awarded or 0 if incorrect */
    evaluateGuess(playerId) {
        const elapsed = (Date.now() - this.roundStartTime) / 1000;
        const timeRemaining = Math.max(0, this.drawTime - elapsed);
        let points = Math.max(FLOOR_POINTS, Math.floor(MAX_POINTS * (timeRemaining / this.drawTime)));
        this.correctGuessers++;
        if (this.correctGuessers === 1)
            points += FIRST_GUESSER_BONUS;
        this.scores[playerId] = (this.scores[playerId] || 0) + points;
        return points;
    }
    /** Award drawer points based on how many guessed correctly */
    awardDrawerPoints() {
        const pts = Math.min(100, this.correctGuessers * 10);
        this.scores[this.currentDrawerId] = (this.scores[this.currentDrawerId] || 0) + pts;
        return pts;
    }
    /** Check if all non-drawers have guessed */
    allGuessed() {
        for (const [id, player] of this.room.players) {
            if (id !== this.currentDrawerId && player.isConnected && !player.hasGuessed) {
                return false;
            }
        }
        return true;
    }
    /** Get round scores */
    getRoundScores() {
        return Array.from(this.room.players.values()).map(p => ({
            playerId: p.id,
            playerName: p.name,
            points: this.scores[p.id] || 0,
        }));
    }
    /** Get leaderboard sorted descending */
    getLeaderboard() {
        return this.getRoundScores().sort((a, b) => b.points - a.points);
    }
    /** Add a stroke */
    addStroke(stroke) {
        this.strokes.push(stroke);
    }
    /** Undo last stroke */
    undoStroke() {
        this.strokes.pop();
        return [...this.strokes];
    }
    /** Clear all strokes */
    clearStrokes() {
        this.strokes = [];
    }
    /** Normalize text for comparison */
    static normalize(text) {
        return text.trim().toLowerCase().replace(/\s+/g, ' ');
    }
    /** Check if a guess matches the word */
    isCorrectGuess(guess) {
        return Game.normalize(guess) === Game.normalize(this.currentWord);
    }
}
exports.Game = Game;
