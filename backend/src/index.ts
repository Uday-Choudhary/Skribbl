import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import socketHandler from './socket';
import { createRoomRouter } from './routes/rooms';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// REST routes
app.use('/rooms', createRoomRouter(io));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Socket.IO handler
socketHandler(io);

// In production, serve the frontend build
if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(clientPath));
    // SPA fallback — all non-API routes serve index.html (Express 5 syntax)
    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Skribbl server running on http://localhost:${PORT}`);
});
