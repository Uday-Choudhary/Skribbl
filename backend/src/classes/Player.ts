import { Socket } from 'socket.io';

export class Player {
    id: string;
    socketId: string;
    name: string;
    score: number;
    hasGuessed: boolean;
    isDrawing: boolean;
    isConnected: boolean;
    isHost: boolean;
    token: string;

    constructor(id: string, socketId: string, name: string, isHost: boolean, token: string) {
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
