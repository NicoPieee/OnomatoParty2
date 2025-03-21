const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // 部屋ごとの情報を管理（players と deck を保持）

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // 部屋を作成するイベント
  socket.on('createRoom', (roomId) => {
    if (rooms[roomId]) {
      socket.emit('error', 'Room already exists');
      return;
    }
    // 部屋を初期化（players と deck を含むオブジェクトとして管理）
    rooms[roomId] = {
      players: [],
      deck: []
    };
    console.log(`Room ${roomId} created`);
    io.emit('roomsList', Object.keys(rooms));

    // デッキを初期化してシャッフルする
    const allCards = [];
    for (let i = 1; i <= 36; i++) {
      const numStr = String(i).padStart(5, '0'); // 00001, 00002, ...
      allCards.push(`stone_${numStr}.jpg`);
    }
    // Fisher–Yates シャッフル
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    rooms[roomId].deck = allCards;
  });

  // 部屋に参加するイベント
  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    // 同じプレイヤー名が既に存在しないかチェック
    const duplicate = rooms[roomId].players.find(p => p.name === playerName);
    if (duplicate) {
      socket.emit('error', 'Player name already taken in this room');
      return;
    }
    // プレイヤーのスコアを初期化して追加
    rooms[roomId].players.push({ id: socket.id, name: playerName, points: 0 });
    socket.join(roomId);

    console.log(`${playerName} joined room ${roomId}`);
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  // ゲーム開始イベント（部屋作成者が待機画面で「ゲーム開始」を押す場合）
  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) {
      socket.emit('error', 'No players in room');
      return;
    }
    // ランダムに親プレイヤーを選ぶ
    room.currentTurnPlayerIndex = Math.floor(Math.random() * room.players.length);
    const currentTurnPlayer = room.players[room.currentTurnPlayerIndex];
    io.to(roomId).emit('gameStarted', currentTurnPlayer);
  });

  // カードを引くイベント（親プレイヤーのみ）
  socket.on('drawCard', (roomId) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    const currentTurnPlayer = room.players[room.currentTurnPlayerIndex];
    if (socket.id !== currentTurnPlayer.id) return;

    const card = room.deck.pop();
    if (!card) {
      socket.emit('error', 'No more cards');
      return;
    }
    io.to(roomId).emit('cardDrawn', card);
  });

  // オノマトペ提出イベント
  socket.on('submitOnomatopoeia', (roomId, onomatopoeia) => {
    io.to(roomId).emit('chooseOnomatopoeia', onomatopoeia);
  });

  // 次のターンへの移行イベント
  socket.on('nextTurn', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
  });

  // オノマトペ選択イベント
  socket.on('chooseOnomatopoeia', (roomId, chosenOnomatopoeia) => {
    io.to(roomId).emit('onomatopoeiaChosen', chosenOnomatopoeia);
  });

  // ゲーム終了イベント
  socket.on('endGame', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) {
      socket.emit('error', 'Room does not exist or no players');
      return;
    }
    const winner = room.players.reduce((prev, current) => (prev.points > current.points ? prev : current));
    io.to(roomId).emit('gameOver', winner);
  });

  // ルーム一覧取得リクエスト
  socket.on('getRooms', () => {
    socket.emit('roomsList', Object.keys(rooms));
  });

  // 切断時の処理
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      io.to(roomId).emit('updatePlayers', rooms[roomId].players);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted`);
        io.emit('roomsList', Object.keys(rooms));
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
