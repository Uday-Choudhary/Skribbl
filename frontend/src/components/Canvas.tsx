import { useRef, useEffect, useCallback, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/gameStore';

interface CanvasProps {
    width?: number;
    height?: number;
}

export default function Canvas({ width = 800, height = 600 }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socket = useSocket();
    const isDrawer = useGameStore(s => s.isDrawer);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(4);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const ctx = useRef<CanvasRenderingContext2D | null>(null);

    const COLORS = [
        '#000000', '#808080', '#FFFFFF', '#FF0000', '#FF5722',
        '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0',
        '#E91E63', '#00BCD4', '#8BC34A', '#795548', '#607D8B',
        '#F44336',
    ];
    const SIZES = [2, 4, 8, 16];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        ctx.current = context;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, width, height);
    }, [width, height]);

    // Receive drawing data from server
    useEffect(() => {
        const context = ctx.current;
        if (!context) return;

        socket.on('draw_data', (data: any) => {
            if (data.type === 'start') {
                context.beginPath();
                context.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
                context.lineWidth = data.size;
                context.moveTo(data.x, data.y);
                lastPoint.current = { x: data.x, y: data.y };
            } else if (data.type === 'move' && lastPoint.current) {
                context.lineTo(data.x, data.y);
                context.stroke();
                lastPoint.current = { x: data.x, y: data.y };
            } else if (data.type === 'end') {
                context.closePath();
                lastPoint.current = null;
            }
        });

        socket.on('canvas_cleared', () => {
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, width, height);
        });

        socket.on('canvas_state', ({ strokes }: { strokes: any[] }) => {
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, width, height);
            for (const stroke of strokes) {
                context.beginPath();
                context.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
                context.lineWidth = stroke.size;
                for (let i = 0; i < stroke.points.length; i++) {
                    const p = stroke.points[i];
                    if (i === 0) context.moveTo(p.x, p.y);
                    else { context.lineTo(p.x, p.y); context.stroke(); }
                }
                context.closePath();
            }
        });

        return () => {
            socket.off('draw_data');
            socket.off('canvas_cleared');
            socket.off('canvas_state');
        };
    }, [socket, width, height]);

    // Clear canvas on new round — use named callback so we only remove OUR listener
    useEffect(() => {
        const context = ctx.current;
        if (!context) return;
        const handleRoundStart = () => {
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, width, height);
        };
        socket.on('round_start', handleRoundStart);
        return () => { socket.off('round_start', handleRoundStart); };
    }, [socket, width, height]);

    const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * width,
            y: ((e.clientY - rect.top) / rect.height) * height,
        };
    }, [width, height]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawer) return;
        const context = ctx.current!;
        const pos = getPos(e);
        setIsDrawing(true);
        lastPoint.current = pos;

        context.beginPath();
        context.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        context.lineWidth = size;
        context.moveTo(pos.x, pos.y);

        socket.emit('draw_start', { x: pos.x, y: pos.y, color, size, tool });
    }, [isDrawer, color, size, tool, getPos, socket]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isDrawer) return;
        const context = ctx.current!;
        const pos = getPos(e);

        context.lineTo(pos.x, pos.y);
        context.stroke();
        lastPoint.current = pos;

        socket.emit('draw_move', { x: pos.x, y: pos.y });
    }, [isDrawing, isDrawer, getPos, socket]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);
        ctx.current?.closePath();
        lastPoint.current = null;
        socket.emit('draw_end');
    }, [isDrawing, socket]);

    return (
        <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 bg-white shadow-xl">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="w-full cursor-crosshair"
                    style={{ aspectRatio: `${width}/${height}` }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {/* Drawing Toolbar — only for drawer */}
            {isDrawer && (
                <div className="card !p-3 flex flex-wrap items-center gap-3">
                    {/* Tool buttons */}
                    <div className="flex gap-1">
                        <button
                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${tool === 'pen' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/70'}`}
                            onClick={() => setTool('pen')}
                        >✏️ Pen</button>
                        <button
                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${tool === 'eraser' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/70'}`}
                            onClick={() => setTool('eraser')}
                        >🧹 Eraser</button>
                    </div>

                    {/* Colors */}
                    <div className="flex gap-1 flex-wrap">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-orange-400 scale-125' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => { setColor(c); setTool('pen'); }}
                            />
                        ))}
                    </div>

                    {/* Sizes */}
                    <div className="flex gap-1.5 items-center">
                        {SIZES.map(s => (
                            <button
                                key={s}
                                className={`rounded-full bg-white transition-transform ${size === s ? 'ring-2 ring-orange-400 scale-110' : ''}`}
                                style={{ width: s + 12, height: s + 12 }}
                                onClick={() => setSize(s)}
                            />
                        ))}
                    </div>

                    {/* Undo / Clear */}
                    <div className="flex gap-1 ml-auto">
                        <button className="btn-secondary !py-1.5 !px-3 text-sm" onClick={() => socket.emit('draw_undo')}>↩️ Undo</button>
                        <button className="btn-secondary !py-1.5 !px-3 text-sm" onClick={() => socket.emit('canvas_clear')}>🗑️ Clear</button>
                    </div>
                </div>
            )}
        </div>
    );
}
