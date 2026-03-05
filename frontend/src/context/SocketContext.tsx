import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// In production, frontend is served from the same origin as backend
// In dev, connect to the explicit backend URL
const BACKEND_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

// Create a single shared socket instance
let socket: Socket | null = null;

function getSocket(): Socket {
    if (!socket) {
        socket = io(BACKEND_URL, { autoConnect: false });
    }
    return socket;
}

interface SocketContextType {
    socket: Socket;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const socketRef = useRef<Socket>(getSocket());

    useEffect(() => {
        const s = socketRef.current;
        s.connect();
        return () => {
            s.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket(): Socket {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within SocketProvider');
    return ctx.socket;
}
