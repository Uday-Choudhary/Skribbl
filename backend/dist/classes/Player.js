"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(id, socketId, name, isHost, token) {
        this.id = id;
        this.socketId = socketId;
        this.name = name;
        this.score = 0;
        this.hasGuessed = false;
        this.isDrawing = false;
        this.isConnected = true;
        this.isHost = isHost;
        this.token = token;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            hasGuessed: this.hasGuessed,
            isDrawing: this.isDrawing,
            isConnected: this.isConnected,
            isHost: this.isHost,
        };
    }
    resetRound() {
        this.hasGuessed = false;
        this.isDrawing = false;
    }
}
exports.Player = Player;
