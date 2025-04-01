const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { db } = require("./db"); // Firebase 用モジュール

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// 各部屋の状態を管理するオブジェクト
const rooms = {};

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // 部屋作成
  socket.on('createRoom', ({ roomId, playerName, deckName }) => {
    if (rooms[roomId]) {
      socket.emit('error', 'Room already exists');
      return;
    }

    const allCards = Array.from({ length: 36 }, (_, i) =>
      `${deckName.toLowerCase()}_${String(i + 1).padStart(5, '0')}.jpg`
    );
    // デッキをシャッフル
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, points: 0 }],
      deck: allCards,
      currentTurnPlayerIndex: 0,
      onomatopoeiaList: [], // 例: [{ onomatopoeia: "ポチャッ", playerIds: [socketId1, socketId2] }]
      deckName,
      currentCard: null,
    };

    socket.join(roomId);
    io.emit('roomsList', Object.keys(rooms));
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  // 部屋参加
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

  // ゲーム開始
  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.currentTurnPlayerIndex = Math.floor(Math.random() * room.players.length);
    io.to(roomId).emit('updateRoomInfo', { deckName: room.deckName });
    io.to(roomId).emit('gameStarted', room.players[room.currentTurnPlayerIndex]);
  });

  // カードを引く（親プレイヤーのみ）
  socket.on('drawCard', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    const currentPlayer = room.players[room.currentTurnPlayerIndex];
    if (socket.id !== currentPlayer.id) return;
    const card = room.deck.pop();
    if (!card) {
      const finalPlayers = [...room.players];
      const maxPoints = Math.max(...finalPlayers.map(p => p.points));
      const winners = finalPlayers.filter(p => p.points === maxPoints);
      io.to(roomId).emit('gameOver', { winners, players: finalPlayers });
      return;
    }
    room.currentCard = card;
    io.to(roomId).emit('cardDrawn', card);
  });

  // 子プレイヤーからオノマトペ送信（グループ化＆Firestore保存）
  socket.on('submitOnomatopoeia', (roomId, onomatopoeia, playerName) => {
    const room = rooms[roomId];
    if (!room) {
      console.log(`Room(${roomId}) not found.`);
      return;
    }

    // 既存グループのチェック
    let group = room.onomatopoeiaList.find(item => item.onomatopoeia === onomatopoeia);
    if (group) {
      if (!group.playerIds.includes(socket.id)) {
        group.playerIds.push(socket.id);
      }
    } else {
      room.onomatopoeiaList.push({ onomatopoeia, playerIds: [socket.id] });
    }
    console.log(`Updated onomatopoeia groups for room ${roomId}:`, room.onomatopoeiaList);

    // Firestore へのログ保存
    const docData = {
      roomId,
      cardName: room.currentCard,
      onomatopoeia,
      playerId: socket.id,
      playerName,
      timestamp: new Date().toISOString(),
    };

    db.collection("answers").add(docData)
      .then(() => {
        console.log("Firestore save successful:", docData);
      })
      .catch((error) => {
        console.error("Firestore save failed:", error);
      });

    // 全子プレイヤーからの送信が完了しているかチェック
    const totalSubmissions = room.onomatopoeiaList.reduce(
      (sum, group) => sum + group.playerIds.length,
      0
    );
    const expectedCount = room.players.length - 1;
    console.log(`Expected submissions: ${expectedCount}, current: ${totalSubmissions}`);

    if (totalSubmissions === expectedCount) {
      const parentPlayer = room.players[room.currentTurnPlayerIndex];
      if (io.sockets.sockets.has(parentPlayer.id)) {
        io.to(parentPlayer.id).emit('onomatopoeiaList', room.onomatopoeiaList);
      }
    }
  });

  // 親プレイヤーがオノマトペを選択（グループ全員に得点＆Firestore保存）
  socket.on('chooseOnomatopoeia', (roomId, selectedOnomatopoeia) => {
    const room = rooms[roomId];
    if (!room) return;
    const group = room.onomatopoeiaList.find(item => item.onomatopoeia === selectedOnomatopoeia);
    let chosenNames = [];
    if (group) {
      group.playerIds.forEach(playerId => {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          player.points += 1;
          chosenNames.push(player.name);
        }
      });
    }

    const parentPlayer = room.players[room.currentTurnPlayerIndex];
    const choiceData = {
      eventType: "choice",
      roomId,
      parentId: parentPlayer.id,
      parentName: parentPlayer.name,
      chosenOnomatopoeia: selectedOnomatopoeia,
      chosenPlayers: chosenNames,
      timestamp: new Date().toISOString(),
    };

    db.collection("answers").add(choiceData)
      .then(() => {
        console.log("Firestore choice save successful:", choiceData);
      })
      .catch((error) => {
        console.error("Firestore choice save failed:", error);
      })
      .finally(() => {
        io.to(roomId).emit('onomatopoeiaChosen', {
          chosenPlayers: chosenNames,
          updatedPlayers: room.players,
        });
        // 次ターンのためにリセット
        room.onomatopoeiaList = [];
        if (room.deck.length === 0) {
          const finalPlayers = [...room.players];
          const maxPoints = Math.max(...finalPlayers.map(p => p.points));
          const winners = finalPlayers.filter(p => p.points === maxPoints);
          io.to(roomId).emit('gameOver', { winners, players: finalPlayers });
          return;
        }
        room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
        io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
      });
  });

  // タイムアウト時の次ターン処理
  socket.on('nextTurn', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.onomatopoeiaList = [];
    room.currentTurnPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    io.to(roomId).emit('newTurn', room.players[room.currentTurnPlayerIndex]);
  });

  // 利用可能な部屋一覧送信
  socket.on('getRooms', () => {
    socket.emit('roomsList', Object.keys(rooms));
  });

  // 切断処理
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
