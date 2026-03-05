import { Server } from 'socket.io';
import { Player } from './Player';
import { v4 as uuidv4 } from 'uuid';

export interface RoomSettings {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    wordCount: number;
    hintCount: number;
}

const DEFAULT_SETTINGS: RoomSettings = {
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hintCount: 2,
};

export class Room {
    id: string;
    code: string;
    hostId: string;
    isPrivate: boolean;
    settings: RoomSettings;
    players: Map<string, Player>;
    status: 'lobby' | 'playing' | 'ended';
    createdAt: Date;
    private io: Server;

    constructor(io: Server, hostPlayer: Player, isPrivate = false, settings?: Partial<RoomSettings>) {
        this.id = uuidv4();
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

    private generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    addPlayer(player: Player): boolean {
        if (this.players.size >= this.settings.maxPlayers) return false;
        this.players.set(player.id, player);
        return true;
    }

    removePlayer(playerId: string): void {
        this.players.delete(playerId);
    }

    getPlayerList() {
        return Array.from(this.players.values()).map(p => p.toJSON());
    }

    broadcast(event: string, data: unknown): void {
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
