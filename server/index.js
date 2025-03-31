// server/index.js (完全版)
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { db } = require("./db"); // Firestoreへの接続(db.js)

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // 部屋作成
  socket.on('createRoom', ({ roomId, playerName, deckName }) => {
    if (rooms[roomId]) return socket.emit('error', 'Room already exists');

    const allCards = Array.from({ length: 36 }, (_, i) =>
      `${deckName.toLowerCase()}_${String(i + 1).padStart(5, '0')}.jpg`
    ).sort(() => Math.random() - 0.5);

    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, points: 0 }],
      deck: allCards,
      currentTurnPlayerIndex: 0,
      onomatopoeiaList: [],
      deckName,
      currentCard: null,
    };

    socket.join(roomId);
    io.emit('roomsList', Object.keys(rooms));
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  // 部屋参加
  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!rooms[roomId]) return socket.emit('error', 'Room does not exist');
    if (rooms[roomId].players.some(p => p.name === playerName))
      return socket.emit('error', 'Name already taken');

    rooms[roomId].players.push({ id: socket.id, name: playerName, points: 0 });
    socket.join(roomId);
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  // ゲーム開始
  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.currentTurnPlayerIndex = Math.floor(Math.random() * room.players.length);
    io.to(roomId).emit('updateRoomInfo', { deckName: room.deckName });
    io.to(roomId).emit('gameStarted', room.players[room.currentTurnPlayerIndex]);
  });

  // カードを引く（親のみ）
  socket.on('drawCard', (roomId) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.players[room.currentTurnPlayerIndex].id) return;

    const card = room.deck.pop();
    if (!card) {
      const finalPlayers = room.players;
      const maxPoints = Math.max(...finalPlayers.map(p => p.points));
      const winners = finalPlayers.filter(p => p.points === maxPoints);
      io.to(roomId).emit('gameOver', { winners, players: finalPlayers });
      return;
    }

    room.currentCard = card;
    io.to(roomId).emit('cardDrawn', card);
  });

  // ★★★ 修正：プレイヤー名もクライアントから受け取る ★★★
  socket.on('submitOnomatopoeia', async (roomId, onomatopoeia, playerName) => {
    const room = rooms[roomId];
    if (!room) return;

    room.onomatopoeiaList.push({ playerId: socket.id, onomatopoeia });

    const docData = {
      roomId,
      cardName: room.currentCard,
      onomatopoeia,
      playerId: socket.id,
      playerName,  // クライアントから受け取った名前
      timestamp: new Date().toISOString(),
    };

    try {
      await db.collection("answers").add(docData);
      console.log("Firestoreに保存完了:", docData);
    } catch (error) {
      console.error("Firestore保存失敗:", error);
    }

    if (room.onomatopoeiaList.length === room.players.length - 1) {
      const parentPlayer = room.players[room.currentTurnPlayerIndex];
      if (io.sockets.sockets.get(parentPlayer.id)) {
        io.to(parentPlayer.id).emit('onomatopoeiaList', room.onomatopoeiaList);
      }
    }
  });

  // 親プレイヤーがオノマトペを選択
  socket.on('chooseOnomatopoeia', async (roomId, selectedPlayerId) => {
    const room = rooms[roomId];
    if (!room) return;

    const chosenPlayer = room.players.find(p => p.id === selectedPlayerId);
    if (chosenPlayer) chosenPlayer.points += 1;

    const chosenEntry = room.onomatopoeiaList.find(o => o.playerId === selectedPlayerId);
    const parentPlayer = room.players[room.currentTurnPlayerIndex];

    await db.collection("answers").add({
      eventType: "choice",
      roomId,
      parentId: parentPlayer.id,
      parentName: parentPlayer.name,
      chosenPlayerId: chosenPlayer?.id,
      chosenPlayerName: chosenPlayer?.name,
      chosenOnomatopoeia: chosenEntry?.onomatopoeia,
      timestamp: new Date().toISOString(),
    });

    io.to(roomId).emit('onomatopoeiaChosen', {
      chosenPlayer,
      updatedPlayers: room.players,
    });

    room.onomatopoeiaList = [];

    if (room.deck.length === 0) {
      const maxPoints = Math.max(...room.players.map(p => p.points));
      const winners = room.players.filter(p => p.points === maxPoints);
      io.to(roomId).emit('gameOver', { winners, players: room.players });
      return;
    }

    room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
  });

  // クライアント切断処理
  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomId => {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
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
