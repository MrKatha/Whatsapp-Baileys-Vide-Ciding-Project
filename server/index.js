const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let sock = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }), // Suppress baileys logs for cleaner console
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code received, emitting to frontend...');
            try {
                const qrImage = await qrcode.toDataURL(qr);
                io.emit('qr', qrImage);
            } catch (err) {
                console.error('Failed to generate QR code data URL', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Logged out from WhatsApp.');
                io.emit('logged_out');
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened!');
            io.emit('ready');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        // Broadcast new messages to the frontend
        for (const m of messages) {
            // we will only broadcast messages that are relatively basic for this clone demo
            if (m.message && m.key.remoteJid !== 'status@broadcast') {
                io.emit('message', m);
            }
        }
    });

    sock.ev.on('chats.upsert', newChats => {
        io.emit('chats', newChats);
    });

    // Listen for chat updates
    sock.ev.on('chats.update', chats => {
        io.emit('chats.update', chats);
    });
}

// Socket.io handlers for frontend Client
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // If socket is already open, immediately inform the frontend
    if (sock && sock.authState.creds.me) {
        socket.emit('ready');
    }

    // Client requests to send a message
    socket.on('send_message', async (data) => {
        const { jid, text } = data;
        if (sock && jid && text) {
            try {
                await sock.sendMessage(jid, { text });
                console.log(`Message sent to ${jid}`);
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    });

    // Client requests all open chats
    socket.on('get_chats', async () => {
        // Baileys doesn't have an instant "get all chats" from standard makeWASocket without store
        // Realistically, we would use makeInMemoryStore, but for this clone we'll expect 
        // chats.upsert to populate them on connection.
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    connectToWhatsApp();
});
