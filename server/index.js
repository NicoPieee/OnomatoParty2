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
        if (rooms[roomId]) {
            socket.emit('error', 'Room already exists');
            return;
        }
        rooms[roomId] = [];
        console.log(`Room ${roomId} created`);
        io.emit('roomsList', Object.keys(rooms)); // 全クライアントに最新ルーム一覧を送信
    });

    // 部屋に参加
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }
        // 同じプレイヤー名が存在しないかチェック
        const duplicate = rooms[roomId].find(player => player.name === playerName);
        if (duplicate) {
            socket.emit('error', 'Player name already taken in this room');
            return;
        }
        // プレイヤーのスコアを初期化して追加
        rooms[roomId].push({ id: socket.id, name: playerName, points: 0 });
        socket.join(roomId);

        console.log(`${playerName} joined room ${roomId}`);
        io.to(roomId).emit('updatePlayers', rooms[roomId]);
    });

    // ゲーム開始
    socket.on('startGame', (roomId) => {
        const roomPlayers = rooms[roomId];
        if (!roomPlayers || roomPlayers.length === 0) {
            socket.emit('error', 'No players in room');
            return;
        }
        currentTurnPlayerIndex = Math.floor(Math.random() * roomPlayers.length); // ランダムで親プレイヤーを選ぶ
        io.to(roomId).emit('gameStarted', roomPlayers[currentTurnPlayerIndex]);
    });

    // カードを引く
    socket.on('drawCard', (roomId) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }
        if (socket.id !== rooms[roomId][currentTurnPlayerIndex].id) return; // 親プレイヤーのみ
        currentCard = "カードの内容"; // ここでカード生成のロジックを拡張可能
        io.to(roomId).emit('cardDrawn', currentCard);
    });

    socket.on('submitOnomatopoeia', (roomId, onomatopoeia) => {
        io.to(roomId).emit('chooseOnomatopoeia', onomatopoeia);
    });

    socket.on('nextTurn', (roomId) => {
        const roomPlayers = rooms[roomId];
        if (!roomPlayers) return;
        currentTurnPlayerIndex = (currentTurnPlayerIndex + 1) % roomPlayers.length;
        io.to(roomId).emit('newTurn', roomPlayers[currentTurnPlayerIndex]);
    });

    socket.on('chooseOnomatopoeia', (roomId, chosenOnomatopoeia) => {
        io.to(roomId).emit('onomatopoeiaChosen', chosenOnomatopoeia);
    });

    socket.on('endGame', (roomId) => {
        const roomPlayers = rooms[roomId];
        if (!roomPlayers || roomPlayers.length === 0) {
            socket.emit('error', 'Room does not exist or no players');
            return;
        }
        let winner = roomPlayers.reduce((prev, current) => (prev.points > current.points ? prev : current));
        io.to(roomId).emit('gameOver', winner);
    });

    // ルーム一覧取得リクエスト
    socket.on('getRooms', () => {
        socket.emit('roomsList', Object.keys(rooms));
    });

    // 切断時の処理
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(player => player.id !== socket.id);
            io.to(roomId).emit('updatePlayers', rooms[roomId]);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted`);
                io.emit('roomsList', Object.keys(rooms)); // 削除後のルーム一覧更新
            }
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
