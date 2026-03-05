"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socket_1 = __importDefault(require("./socket"));
const rooms_1 = require("./routes/rooms");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express_1.default.json());
// REST routes
app.use('/rooms', (0, rooms_1.createRoomRouter)(io));
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Socket.IO handler
(0, socket_1.default)(io);
// In production, serve the frontend build
if (process.env.NODE_ENV === 'production') {
    const clientPath = path_1.default.join(__dirname, '../../frontend/dist');
    app.use(express_1.default.static(clientPath));
    // SPA fallback — all non-API routes serve index.html (Express 5 syntax)
    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path_1.default.join(clientPath, 'index.html'));
    });
}
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Skribbl server running on http://localhost:${PORT}`);
});
