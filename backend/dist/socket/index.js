"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = socketHandler;
const uuid_1 = require("uuid");
const Player_1 = require("../classes/Player");
const Room_1 = require("../classes/Room");
const Game_1 = require("../classes/Game");
const roomStore_1 = require("../db/roomStore");
// Maps for connection tracking
const socketPlayerMap = new Map();
const roomGames = new Map();
// Token → { playerId, roomId } for reconnection
const tokenMap = new Map();
function getSocketEntry(socket) {
    return socketPlayerMap.get(socket.id);
}
function socketHandler(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 Connected: ${socket.id}`);
        // ─── CREATE ROOM ────────────────────────────────────────────────
        socket.on('create_room', ({ playerName, settings, isPrivate } = {}) => {
            if (!playerName)
                return socket.emit('error', { code: 'INVALID', message: 'Player name required' });
            const playerId = (0, uuid_1.v4)();
            const token = (0, uuid_1.v4)();
            const host = new Player_1.Player(playerId, socket.id, playerName.trim(), true, token);
            const room = new Room_1.Room(io, host, isPrivate || false, settings || {});
            (0, roomStore_1.addRoom)(room);
            socket.join(room.id);
            socketPlayerMap.set(socket.id, { playerId, roomId: room.id });
            tokenMap.set(token, { playerId, roomId: room.id });
            socket.emit('room_created', { roomId: room.id, roomCode: room.code, playerId, token });
            io.to(room.id).emit('game_state', room.toJSON());
        });
        // ─── JOIN ROOM ──────────────────────────────────────────────────
        socket.on('join_room', ({ roomId, roomCode, playerName } = {}) => {
            let room;
            if (roomId)
                room = (0, roomStore_1.getRoomById)(roomId);
            else if (roomCode)
                room = (0, roomStore_1.getRoomByCode)(roomCode);
            if (!room)
                return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
            if (room.status === 'playing')
                return socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Game already started' });
            if (room.players.size >= room.settings.maxPlayers)
                return socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
            const playerId = (0, uuid_1.v4)();
            const token = (0, uuid_1.v4)();
            const player = new Player_1.Player(playerId, socket.id, playerName.trim(), false, token);
            room.addPlayer(player);
            socket.join(room.id);
            socketPlayerMap.set(socket.id, { playerId, roomId: room.id });
            tokenMap.set(token, { playerId, roomId: room.id });
            socket.emit('room_joined', { roomId: room.id, roomCode: room.code, playerId, token });
            io.to(room.id).emit('player_joined', { player: player.toJSON(), players: room.getPlayerList() });
            socket.emit('game_state', room.toJSON());
        });
        // ─── RECONNECT ──────────────────────────────────────────────────
        socket.on('reconnect_player', ({ token } = {}) => {
            if (!token)
                return socket.emit('error', { code: 'INVALID', message: 'Token required' });
            const entry = tokenMap.get(token);
            if (!entry)
                return socket.emit('error', { code: 'INVALID', message: 'Invalid token' });
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!room)
                return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room no longer exists' });
            const player = room.players.get(entry.playerId);
            if (!player)
                return socket.emit('error', { code: 'INVALID', message: 'Player not found in room' });
            // Restore connection
            player.socketId = socket.id;
            player.isConnected = true;
            socket.join(room.id);
            socketPlayerMap.set(socket.id, { playerId: entry.playerId, roomId: entry.roomId });
            socket.emit('reconnected', { roomId: room.id, roomCode: room.code, playerId: entry.playerId });
            socket.emit('game_state', room.toJSON());
            io.to(room.id).emit('player_joined', { player: player.toJSON(), players: room.getPlayerList() });
            // If a game is in progress, send current game state
            const game = roomGames.get(entry.roomId);
            if (game && room.status === 'playing') {
                socket.emit('round_start', {
                    round: game.round,
                    totalRounds: game.totalRounds,
                    drawerId: game.currentDrawerId,
                    drawTime: game.drawTime,
                    isDrawer: entry.playerId === game.currentDrawerId,
                });
                if (game.currentWord) {
                    if (entry.playerId === game.currentDrawerId) {
                        socket.emit('word_to_draw', { word: game.currentWord });
                    }
                    else {
                        socket.emit('word_hint', { hint: game.currentHint });
                    }
                }
                // Send current canvas state
                if (game.strokes.length > 0) {
                    socket.emit('canvas_state', { strokes: game.strokes });
                }
                socket.emit('score_update', { scores: game.scores, leaderboard: game.getLeaderboard() });
            }
        });
        // ─── UPDATE SETTINGS ────────────────────────────────────────────
        socket.on('update_settings', ({ settings } = {}) => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!room)
                return;
            if (room.hostId !== entry.playerId)
                return socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the host can change settings' });
            room.settings = { ...room.settings, ...settings };
            io.to(room.id).emit('settings_updated', { settings: room.settings });
        });
        // ─── START GAME ─────────────────────────────────────────────────
        socket.on('start_game', () => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!room)
                return;
            if (room.hostId !== entry.playerId)
                return socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the host can start the game' });
            if (room.players.size < 2)
                return socket.emit('error', { code: 'INVALID', message: 'Need at least 2 players' });
            room.status = 'playing';
            const game = new Game_1.Game(io, room);
            roomGames.set(room.id, game);
            io.to(room.id).emit('game_started', { totalRounds: game.totalRounds });
            startNextTurn(io, room, game);
        });
        // ─── WORD CHOSEN ────────────────────────────────────────────────
        socket.on('word_chosen', ({ word } = {}) => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!game || !room)
                return;
            if (entry.playerId !== game.currentDrawerId)
                return;
            // Server-side validation: word must be in offered options
            if (!game.isValidWordChoice(word)) {
                return socket.emit('error', { code: 'INVALID_WORD', message: 'Chosen word not in offered options' });
            }
            applyWordChoice(io, room, game, word);
        });
        // ─── PLAY AGAIN ─────────────────────────────────────────────────
        socket.on('play_again', () => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!room)
                return;
            if (room.hostId !== entry.playerId)
                return socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the host can restart' });
            // Reset room to lobby
            room.status = 'lobby';
            roomGames.delete(room.id);
            // Reset all player scores
            for (const player of room.players.values()) {
                player.score = 0;
                player.resetRound();
            }
            io.to(room.id).emit('play_again', {});
            io.to(room.id).emit('game_state', room.toJSON());
        });
        // ─── DRAWING EVENTS ─────────────────────────────────────────────
        socket.on('draw_start', (data) => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            if (!game || entry.playerId !== game.currentDrawerId)
                return;
            const stroke = {
                id: (0, uuid_1.v4)(),
                points: [{ x: data.x, y: data.y }],
                color: data.color,
                size: data.size,
                tool: data.tool || 'pen',
            };
            game.addStroke(stroke);
            socket.to(entry.roomId).emit('draw_data', { type: 'start', ...data, strokeId: stroke.id });
        });
        socket.on('draw_move', (data) => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            if (!game || entry.playerId !== game.currentDrawerId)
                return;
            const lastStroke = game.strokes[game.strokes.length - 1];
            if (lastStroke)
                lastStroke.points.push({ x: data.x, y: data.y });
            socket.to(entry.roomId).emit('draw_data', { type: 'move', x: data.x, y: data.y });
        });
        socket.on('draw_end', () => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            if (!game || entry.playerId !== game.currentDrawerId)
                return;
            socket.to(entry.roomId).emit('draw_data', { type: 'end' });
        });
        socket.on('draw_undo', () => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            if (!game || entry.playerId !== game.currentDrawerId)
                return;
            const strokes = game.undoStroke();
            io.to(entry.roomId).emit('canvas_state', { strokes });
        });
        socket.on('canvas_clear', () => {
            const entry = getSocketEntry(socket);
            if (!entry)
                return;
            const game = roomGames.get(entry.roomId);
            if (!game || entry.playerId !== game.currentDrawerId)
                return;
            game.clearStrokes();
            io.to(entry.roomId).emit('canvas_cleared');
        });
        // ─── GUESS / CHAT ───────────────────────────────────────────────
        socket.on('guess', ({ text } = {}) => {
            const entry = getSocketEntry(socket);
            if (!entry || !text)
                return;
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            const game = roomGames.get(entry.roomId);
            if (!room || !game)
                return;
            const player = room.players.get(entry.playerId);
            if (!player || player.isDrawing || player.hasGuessed)
                return;
            if (game.isCorrectGuess(text)) {
                player.hasGuessed = true;
                const points = game.evaluateGuess(entry.playerId);
                socket.emit('guess_result', { correct: true, points });
                io.to(room.id).emit('chat_message', {
                    playerId: entry.playerId,
                    playerName: player.name,
                    text: `${player.name} guessed the word!`,
                    type: 'correct',
                });
                io.to(room.id).emit('score_update', { scores: game.scores, leaderboard: game.getLeaderboard() });
                if (game.allGuessed()) {
                    endRound(io, room, game);
                }
            }
            else {
                socket.emit('guess_result', { correct: false });
                io.to(room.id).emit('chat_message', {
                    playerId: entry.playerId,
                    playerName: player.name,
                    text,
                    type: 'guess',
                });
            }
        });
        socket.on('chat', ({ text } = {}) => {
            const entry = getSocketEntry(socket);
            if (!entry || !text)
                return;
            const room = (0, roomStore_1.getRoomById)(entry.roomId);
            if (!room)
                return;
            const player = room.players.get(entry.playerId);
            if (!player)
                return;
            io.to(room.id).emit('chat_message', {
                playerId: entry.playerId,
                playerName: player.name,
                text,
                type: 'chat',
            });
        });
        // ─── DISCONNECT ─────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`🔌 Disconnected: ${socket.id}`);
            const entry = socketPlayerMap.get(socket.id);
            if (!entry)
                return;
            const { playerId, roomId } = entry;
            socketPlayerMap.delete(socket.id);
            const room = (0, roomStore_1.getRoomById)(roomId);
            if (!room)
                return;
            const player = room.players.get(playerId);
            if (player)
                player.isConnected = false;
            io.to(roomId).emit('player_left', { playerId, players: room.getPlayerList() });
            // If drawer disconnects mid-round, end the round after 3s
            const game = roomGames.get(roomId);
            if (game && game.currentDrawerId === playerId && room.status === 'playing') {
                setTimeout(() => {
                    // Only end round if player didn't reconnect
                    const p = room.players.get(playerId);
                    if (p && !p.isConnected) {
                        endRound(io, room, game);
                    }
                }, 3000);
            }
            // Cleanup empty rooms after 5 min
            setTimeout(() => {
                const r = (0, roomStore_1.getRoomById)(roomId);
                if (!r)
                    return;
                const connected = Array.from(r.players.values()).filter(p => p.isConnected);
                if (connected.length === 0) {
                    roomGames.delete(roomId);
                    (0, roomStore_1.deleteRoom)(roomId);
                    // Clean token entries
                    for (const [token, val] of tokenMap) {
                        if (val.roomId === roomId)
                            tokenMap.delete(token);
                    }
                }
            }, 5 * 60 * 1000);
        });
    });
}
// ─── HELPERS ──────────────────────────────────────────────────────────
/** Apply a word choice — used by both manual selection and auto-select timeout */
function applyWordChoice(io, room, game, word) {
    game.setWord(word);
    // Send hint to guessers, plaintext to drawer
    for (const [id, player] of room.players) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (!targetSocket)
            continue;
        if (id === game.currentDrawerId) {
            targetSocket.emit('word_to_draw', { word });
        }
        else {
            targetSocket.emit('word_hint', { hint: game.currentHint });
        }
    }
    // Start timer
    game.startTimer((secs) => io.to(room.id).emit('timer_update', { secondsRemaining: secs }), () => endRound(io, room, game));
}
function startNextTurn(io, room, game) {
    const continues = game.nextTurn();
    if (!continues) {
        endGame(io, room, game);
        return;
    }
    const wordOptions = game.sendWordOptions();
    // Send round_start to everyone; word options ONLY to drawer
    for (const [id, player] of room.players) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (!targetSocket)
            continue;
        if (id === game.currentDrawerId) {
            targetSocket.emit('round_start', {
                round: game.round,
                totalRounds: game.totalRounds,
                drawerId: game.currentDrawerId,
                drawTime: game.drawTime,
                wordOptions,
                isDrawer: true,
            });
        }
        else {
            targetSocket.emit('round_start', {
                round: game.round,
                totalRounds: game.totalRounds,
                drawerId: game.currentDrawerId,
                drawTime: game.drawTime,
                isDrawer: false,
            });
        }
    }
    // 15-second auto-select timeout — if drawer doesn't pick, server picks first word
    game.wordSelectionTimeout = setTimeout(() => {
        if (game.currentWord === '' && game.pendingWordOptions.length > 0) {
            applyWordChoice(io, room, game, game.pendingWordOptions[0]);
            io.to(room.id).emit('chat_message', {
                playerId: 'system',
                playerName: 'System',
                text: 'Drawer took too long — word auto-selected!',
                type: 'system',
            });
        }
    }, 15000);
}
function endRound(io, room, game) {
    game.clearTimers();
    game.awardDrawerPoints();
    io.to(room.id).emit('round_end', {
        word: game.currentWord,
        roundScores: game.getRoundScores(),
        cumulativeScores: game.scores,
        leaderboard: game.getLeaderboard(),
    });
    // 5 second interstitial, then next turn
    setTimeout(() => startNextTurn(io, room, game), 5000);
}
function endGame(io, room, game) {
    game.clearTimers();
    room.status = 'ended';
    const leaderboard = game.getLeaderboard();
    io.to(room.id).emit('game_over', {
        winner: leaderboard[0],
        leaderboard,
    });
    // Don't delete game state yet — needed for play_again
}
