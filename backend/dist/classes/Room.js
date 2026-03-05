"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const uuid_1 = require("uuid");
const DEFAULT_SETTINGS = {
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hintCount: 2,
};
class Room {
    constructor(io, hostPlayer, isPrivate = false, settings) {
        this.id = (0, uuid_1.v4)();
        this.code = this.generateCode();
        this.hostId = hostPlayer.id;
        this.isPrivate = isPrivate;
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.players = new Map();
        this.status = 'lobby';
        this.createdAt = new Date();
        this.io = io;
        this.addPlayer(hostPlayer);
    }
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    addPlayer(player) {
        if (this.players.size >= this.settings.maxPlayers)
            return false;
        this.players.set(player.id, player);
        return true;
    }
    removePlayer(playerId) {
        this.players.delete(playerId);
    }
    getPlayerList() {
        return Array.from(this.players.values()).map(p => p.toJSON());
    }
    broadcast(event, data) {
        this.io.to(this.id).emit(event, data);
    }
    toJSON() {
        return {
            id: this.id,
            code: this.code,
            hostId: this.hostId,
            isPrivate: this.isPrivate,
            settings: this.settings,
            players: this.getPlayerList(),
            status: this.status,
        };
    }
}
exports.Room = Room;
