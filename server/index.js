const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// ★ ここで origin を明示的に設定（必要に応じて複数許可も可能）
app.use(cors({
  origin: "http://192.168.3.9:3000", // ← フロントのURLに合わせる！
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://192.168.3.9:3000", // ★ ここも必ず合わせること！
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('createRoom', ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      socket.emit('error', 'Room already exists');
      return;
    }

    const allCards = Array.from({ length: 36 }, (_, i) => `stone_${String(i + 1).padStart(5, '0')}.jpg`);
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, points: 0 }],
      deck: allCards,
      currentTurnPlayerIndex: 0,
      onomatopoeiaList: []
    };

    socket.join(roomId);
    io.emit('roomsList', Object.keys(rooms));
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    if (rooms[roomId].players.some(p => p.name === playerName)) {
      socket.emit('error', 'Name already taken in this room');
      return;
    }
    rooms[roomId].players.push({ id: socket.id, name: playerName, points: 0 });
    socket.join(roomId);
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.currentTurnPlayerIndex = Math.floor(Math.random() * room.players.length);
    io.to(roomId).emit('gameStarted', room.players[room.currentTurnPlayerIndex]);
  });

  socket.on('drawCard', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const currentPlayer = room.players[room.currentTurnPlayerIndex];
    if (socket.id !== currentPlayer.id) return;

    const card = room.deck.pop();
    if (!card) {
      io.to(roomId).emit('gameOver', room.players.reduce((a, b) => (a.points > b.points ? a : b)));
      return;
    }
    io.to(roomId).emit('cardDrawn', card);
  });

  socket.on('submitOnomatopoeia', (roomId, onomatopoeia) => {
    const room = rooms[roomId];
    if (!room) {
      console.log(`Room(${roomId})が見つかりません。`);
      return;
    }

    room.onomatopoeiaList.push({ playerId: socket.id, onomatopoeia });
    console.log(`オノマトペリスト(${roomId}):`, room.onomatopoeiaList);

    const expectedCount = room.players.length - 1;
    const currentCount = room.onomatopoeiaList.length;

    if (currentCount === expectedCount) {
      const parentPlayer = room.players[room.currentTurnPlayerIndex];
      if (io.sockets.sockets.has(parentPlayer.id)) {
        io.to(parentPlayer.id).emit('onomatopoeiaList', room.onomatopoeiaList);
      }
    }
  });

  socket.on('chooseOnomatopoeia', (roomId, selectedPlayerId) => {
    const room = rooms[roomId];
    if (!room) return;

    const chosenPlayer = room.players.find(p => p.id === selectedPlayerId);
    if (chosenPlayer) chosenPlayer.points += 1;

    io.to(roomId).emit('onomatopoeiaChosen', {
      chosenPlayer,
      updatedPlayers: room.players
    });

    room.onomatopoeiaList = [];
    room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
  });

  socket.on('nextTurn', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.onomatopoeiaList = [];
    room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
  });

  socket.on('getRooms', () => {
    socket.emit('roomsList', Object.keys(rooms));
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomId => {
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        io.emit('roomsList', Object.keys(rooms));
      } else {
        io.to(roomId).emit('updatePlayers', rooms[roomId].players);
      }
    });
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
