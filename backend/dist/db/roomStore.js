"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomById = getRoomById;
exports.getRoomByCode = getRoomByCode;
exports.addRoom = addRoom;
exports.deleteRoom = deleteRoom;
exports.getAllPublicRooms = getAllPublicRooms;
const rooms = new Map();
function getRoomById(id) {
    return rooms.get(id);
}
function getRoomByCode(code) {
    for (const room of rooms.values()) {
        if (room.code === code.toUpperCase())
            return room;
    }
    return undefined;
}
function addRoom(room) {
    rooms.set(room.id, room);
}
function deleteRoom(id) {
    rooms.delete(id);
}
function getAllPublicRooms() {
    return Array.from(rooms.values()).filter(r => !r.isPrivate && r.status === 'lobby');
}
