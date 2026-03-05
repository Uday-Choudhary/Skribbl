"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomRouter = createRoomRouter;
const express_1 = require("express");
const uuid_1 = require("uuid");
const Room_1 = require("../classes/Room");
const Player_1 = require("../classes/Player");
const roomStore_1 = require("../db/roomStore");
function createRoomRouter(io) {
    const router = (0, express_1.Router)();
    // POST /rooms — create a new room
    router.post('/', (req, res) => {
        const { playerName, settings, isPrivate } = req.body;
        if (!playerName || playerName.trim().length < 2) {
            res.status(400).json({ error: 'Player name must be at least 2 characters' });
            return;
        }
        const playerId = (0, uuid_1.v4)();
        const token = (0, uuid_1.v4)();
        const host = new Player_1.Player(playerId, '', playerName.trim(), true, token);
        const room = new Room_1.Room(io, host, isPrivate || false, settings || {});
        (0, roomStore_1.addRoom)(room);
        res.status(201).json({
            roomId: room.id,
            roomCode: room.code,
            playerId,
            token,
        });
    });
    // GET /rooms — list all public rooms
    router.get('/', (_req, res) => {
        const publicRooms = (0, roomStore_1.getAllPublicRooms)().map(r => r.toJSON());
        res.json(publicRooms);
    });
    // GET /rooms/:id — get room by ID
    router.get('/:id', (req, res) => {
        const room = (0, roomStore_1.getRoomById)(req.params.id);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        res.json(room.toJSON());
    });
    // GET /rooms/code/:code — get room by join code
    router.get('/code/:code', (req, res) => {
        const room = (0, roomStore_1.getRoomByCode)(req.params.code);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        res.json(room.toJSON());
    });
    return router;
}
