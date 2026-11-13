import { EventEmitter } from 'events';

/**
 * Shared Event Bus for decoupling ticket mutations and agent swarm telemetry
 * from active client connections.
 */
export const supportOpsBus = new EventEmitter();
supportOpsBus.setMaxListeners(100);

// In-memory registry and tracking maps expected by chat and ticket services
export const activeSockets = new Map();
export const visitors = new Map();
export const staff = new Map();

let heartbeatTimer = null;

/**
 * Initializes real-time background timers and handlers (called from server.js)
 */
export function initializeRealtime(fastifyInstance) {
    const HEARTBEAT_INTERVAL_MS = 30000;

    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(() => {
        for (const [workspaceId, clients] of activeSockets.entries()) {
            for (const socket of clients) {
                if (socket.isAlive === false) {
                    clients.delete(socket);
                    socket.terminate();
                    continue;
                }
                socket.isAlive = false;
                socket.ping();
            }
            if (clients.size === 0) {
                activeSockets.delete(workspaceId);
            }
        }
    }, HEARTBEAT_INTERVAL_MS);

    if (fastifyInstance && typeof fastifyInstance.log?.info === 'function') {
        fastifyInstance.log.info('SupportOps real-time subsystem initialized');
    }
}

/**
 * Gracefully shuts down real-time background timers and active sockets (called from server.js)
 */
export function closeRealtime() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    for (const clients of activeSockets.values()) {
        for (const socket of clients) {
            socket.close(1001, 'Server shutting down');
        }
    }
    activeSockets.clear();
    visitors.clear();
    staff.clear();
}

/**
 * Broadcasts a structured JSON event to all connected WebSocket clients
 * belonging to a specific workspace (or globally if workspaceId is omitted).
 */
export function broadcastTicketEvent(workspaceId, eventType, payload) {
    const message = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
    });

    if (workspaceId && activeSockets.has(workspaceId)) {
        for (const socket of activeSockets.get(workspaceId)) {
            if (socket.readyState === 1) { // WebSocket.OPEN
                socket.send(message);
            }
        }
        return;
    }

    for (const clients of activeSockets.values()) {
        for (const socket of clients) {
            if (socket.readyState === 1) {
                socket.send(message);
            }
        }
    }
}

// Export push as an alias for broadcastTicketEvent
export const push = broadcastTicketEvent;

/**
 * Helper expected by chatRoutes to initialize or attach SSE / stream connections
 */
export function openStream(req, reply, workspaceId = 'default') {
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const sendSSE = (event, data) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendSSE('connected', {
        workspaceId,
        message: 'Stream connected successfully',
        timestamp: new Date().toISOString(),
    });

    return sendSSE;
}

/**
 * Fastify plugin registering both:
 * 1. Bidirectional WebSockets (/ws) for real-time ticket triage & status updates
 * 2. Server-Sent Events (/logs/stream) for live autonomous agent execution logs
 */
export default async function realtimeRoutes(fastify, options) {
    if (!heartbeatTimer) {
        initializeRealtime(fastify);
    }

    fastify.addHook('onClose', async () => {
        closeRealtime();
    });

    /**
     * 1. Real-Time Ticket Triage WebSocket Endpoint
     * URL: wss://<host>/api/v1/supportops/ws?workspaceId=<id>&token=<jwt>
     */
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        const workspaceId = req.query.workspaceId || 'default';
        const token = req.query.token || req.headers['authorization'];

        if (!token && process.env.NODE_ENV === 'production') {
            socket.close(4001, 'Unauthorized: Missing session token');
            return;
        }

        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        if (!activeSockets.has(workspaceId)) {
            activeSockets.set(workspaceId, new Set());
        }
        activeSockets.get(workspaceId).add(socket);

        fastify.log.info({ workspaceId }, 'SupportOps WebSocket client connected');

        socket.send(
            JSON.stringify({
                event: 'CONNECTION_ACK',
                workspaceId,
                timestamp: new Date().toISOString(),
            })
        );

        socket.on('message', async (rawMessage) => {
            try {
                const message = JSON.parse(rawMessage.toString());

                switch (message.type) {
                    case 'PING':
                        socket.send(JSON.stringify({ event: 'PONG', timestamp: new Date().toISOString() }));
                        break;

                    case 'TICKET_TRIAGE_ACTION':
                        supportOpsBus.emit('ticket:action', {
                            workspaceId,
                            ticketId: message.ticketId,
                            action: message.action,
                            payload: message.payload,
                        });
                        broadcastTicketEvent(workspaceId, 'TICKET_UPDATED', {
                            ticketId: message.ticketId,
                            status: message.action,
                        });
                        break;

                    default:
                        socket.send(
                            JSON.stringify({
                                event: 'ERROR',
                                message: `Unsupported message type: ${message.type}`,
                            })
                        );
                }
            } catch (err) {
                fastify.log.warn({ err }, 'Malformed WebSocket payload received');
                socket.send(JSON.stringify({ event: 'ERROR', message: 'Invalid JSON payload' }));
            }
        });

        socket.on('close', () => {
            const clients = activeSockets.get(workspaceId);
            if (clients) {
                clients.delete(socket);
                if (clients.size === 0) {
                    activeSockets.delete(workspaceId);
                }
            }
            fastify.log.info({ workspaceId }, 'SupportOps WebSocket client disconnected');
        });

        socket.on('error', (err) => {
            fastify.log.error({ err, workspaceId }, 'SupportOps WebSocket error');
        });
    });

    /**
     * 2. Server-Sent Events (SSE) Log Stream Endpoint
     * URL: GET https://<host>/api/v1/supportops/logs/stream?workspaceId=<id>
     */
    fastify.get('/logs/stream', async (req, reply) => {
        const workspaceId = req.query.workspaceId || 'default';

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const sendSSE = (event, data) => {
            reply.raw.write(`event: ${event}\n`);
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        sendSSE('connected', {
            workspaceId,
            message: 'Subscribed to SupportOps agent execution logs',
            timestamp: new Date().toISOString(),
        });

        const keepAlive = setInterval(() => {
            reply.raw.write(': keep-alive\n\n');
        }, 15000);

        const onAgentLog = (logEntry) => {
            if (!logEntry.workspaceId || logEntry.workspaceId === workspaceId) {
                sendSSE('agent_log', logEntry);
            }
        };

        supportOpsBus.on('agent:log', onAgentLog);

        req.raw.on('close', () => {
            clearInterval(keepAlive);
            supportOpsBus.off('agent:log', onAgentLog);
            fastify.log.info({ workspaceId }, 'SupportOps SSE log stream closed');
        });

        return reply;
    });

    /**
     * 3. Health / Metrics Check
     * URL: GET https://<host>/api/v1/supportops/realtime/health
     */
    fastify.get('/realtime/health', async () => {
        let totalConnections = 0;
        for (const clients of activeSockets.values()) {
            totalConnections += clients.size;
        }
        return {
            status: 'ok',
            activeWorkspaces: activeSockets.size,
            activeWebSocketClients: totalConnections,
            timestamp: new Date().toISOString(),
        };
    });
}