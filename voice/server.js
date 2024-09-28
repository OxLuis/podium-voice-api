const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};  // Almacenar las salas

app.use(express.static('public'));

app.get('/rooms', (req, res) => {
    const roomData = Object.keys(rooms).map(roomName => ({
        roomName,
        participantCount: rooms[roomName].length,
        participants: rooms[roomName],
    }));
    res.json(roomData);
});

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('create-room', (roomName, username) => {
        if (!rooms[roomName]) {
            rooms[roomName] = [];
        }
        rooms[roomName].push({ username, id: socket.id, role: 'moderator' });
        socket.join(roomName);
        console.log(`Sala ${roomName} creada por ${username}`);
        io.emit('room-created', { roomName, username });
    });

    socket.on('join-room', ({ roomName, username, role }) => {
        if (rooms[roomName]) {
            rooms[roomName].push({ username, id: socket.id, role });
            socket.join(roomName);
            io.to(roomName).emit('room-data', { roomName, participants: rooms[roomName] });
            console.log(`${username} se ha unido a la sala ${roomName}`);
        } else {
            socket.emit('error', 'Sala no encontrada');
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        for (const roomName in rooms) {
            rooms[roomName] = rooms[roomName].filter(p => p.id !== socket.id);
            if (rooms[roomName].length === 0) {
                delete rooms[roomName];
            }
        }
    });

    // Señalización WebRTC
    socket.on('webrtc-signal', ({ roomName, signal, targetId }) => {
        console.log(`Señal WebRTC de ${socket.id} hacia ${targetId} en la sala ${roomName}:`, signal);
        io.to(targetId).emit('webrtc-signal', { signal, senderId: socket.id });
    });
});

server.listen(2500, () => {
    console.log('Servidor escuchando en el puerto 2500');
});
