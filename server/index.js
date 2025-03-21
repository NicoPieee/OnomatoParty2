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

const rooms = {}; // 部屋ごとのプレイヤー情報を管理
let currentTurnPlayerIndex = 0; // 親プレイヤーのターン管理
let currentCard = null; // 引いたカード

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // 部屋を作成
    socket.on('createRoom', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        console.log(`Room ${roomId} created`);
    });

    // 部屋に参加
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }

        rooms[roomId].push({ id: socket.id, name: playerName });
        socket.join(roomId);

        console.log(`${playerName} joined room ${roomId}`);
        io.to(roomId).emit('updatePlayers', rooms[roomId]);
    });

    // ゲーム開始
    socket.on('startGame', (roomId) => {
        const roomPlayers = rooms[roomId];
        currentTurnPlayerIndex = Math.floor(Math.random() * roomPlayers.length); // ランダムで親プレイヤーを選ぶ
        io.to(roomId).emit('gameStarted', roomPlayers[currentTurnPlayerIndex]); // 親プレイヤーをクライアントに送信
    });

    // カードを引く
    socket.on('drawCard', (roomId) => {
        if (socket.id !== rooms[roomId][currentTurnPlayerIndex].id) return; // 親プレイヤーだけがカードを引ける
        currentCard = "カードの内容"; // ここにカードのロジックを追加
        io.to(roomId).emit('cardDrawn', currentCard); // カードをクライアントに送信
    });

    // 切断時に部屋から削除
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(player => player.id !== socket.id);
            io.to(roomId).emit('updatePlayers', rooms[roomId]);

            // 🔥 部屋のプレイヤーが0人なら削除
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted`);
            }
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
