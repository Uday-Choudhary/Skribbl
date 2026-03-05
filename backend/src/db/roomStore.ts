// In-memory store for all active rooms
import { Room } from '../classes/Room';

const rooms = new Map<string, Room>();

export function getRoomById(id: string): Room | undefined {
    return rooms.get(id);
}

export function getRoomByCode(code: string): Room | undefined {
    for (const room of rooms.values()) {
        if (room.code === code.toUpperCase()) return room;
    }
    return undefined;
}

export function addRoom(room: Room): void {
    rooms.set(room.id, room);
}

export function deleteRoom(id: string): void {
    rooms.delete(id);
}

export function getAllPublicRooms(): Room[] {
    return Array.from(rooms.values()).filter(r => !r.isPrivate && r.status === 'lobby');
}
