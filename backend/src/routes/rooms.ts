import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Room } from '../classes/Room';
import { Player } from '../classes/Player';
import { addRoom, getRoomById, getRoomByCode, getAllPublicRooms } from '../db/roomStore';
import { Server } from 'socket.io';

export function createRoomRouter(io: Server) {
    const router = Router();

    // POST /rooms — create a new room
    router.post('/', (req: Request, res: Response) => {
        const { playerName, settings, isPrivate } = req.body;
        if (!playerName || playerName.trim().length < 2) {
            res.status(400).json({ error: 'Player name must be at least 2 characters' });
            return;
        }

        const playerId = uuidv4();
        const token = uuidv4();
        const host = new Player(playerId, '', playerName.trim(), true, token);
        const room = new Room(io, host, isPrivate || false, settings || {});
        addRoom(room);

        res.status(201).json({
            roomId: room.id,
            roomCode: room.code,
            playerId,
            token,
        });
    });

    // GET /rooms — list all public rooms
    router.get('/', (_req: Request, res: Response) => {
        const publicRooms = getAllPublicRooms().map(r => r.toJSON());
        res.json(publicRooms);
    });

    // GET /rooms/:id — get room by ID
    router.get('/:id', (req: Request, res: Response) => {
        const room = getRoomById(req.params.id as string);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        res.json(room.toJSON());
    });

    // GET /rooms/code/:code — get room by join code
    router.get('/code/:code', (req: Request, res: Response) => {
        const room = getRoomByCode(req.params.code as string);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        res.json(room.toJSON());
    });

    return router;
}
