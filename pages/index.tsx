import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function Home() {
    const socketRef = useRef(null);
    const [roomId, setRoomId] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [players, setPlayers] = useState([]);
    const [currentCard, setCurrentCard] = useState(null);
    const [onomatopoeia, setOnomatopoeia] = useState("");
    const [gameState, setGameState] = useState("title"); // 画面遷移用の状態管理

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = io("http://localhost:5000");

            socketRef.current.on("updatePlayers", (players) => {
                setPlayers(players);
            });

            socketRef.current.on("gameStarted", (player) => {
                alert(`${player.name}が親プレイヤーになりました！`);
                setGameState("game");
            });

            socketRef.current.on("cardDrawn", (card) => {
                setCurrentCard(card);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const createRoom = () => {
        if (!roomId) return;
        socketRef.current.emit("createRoom", roomId);
        setGameState("join"); // 部屋作成後に部屋参加画面へ遷移
    };

    const joinRoom = () => {
        if (!roomId || !playerName) return;
        socketRef.current.emit("joinRoom", { roomId, playerName });
        setGameState("game"); // 部屋参加後にゲーム画面へ遷移
    };

    const startGame = () => {
        socketRef.current.emit("startGame", roomId);
    };

    const drawCard = () => {
        socketRef.current.emit("drawCard", roomId);
    };

    const submitOnomatopoeia = () => {
        if (onomatopoeia) {
            socketRef.current.emit("submitOnomatopoeia", roomId, onomatopoeia);
        }
    };

    const renderTitleScreen = () => (
        <div>
            <h1>OnomatoParty2</h1>
            <button onClick={() => setGameState("createRoom")}>ゲームスタート</button>
        </div>
    );

    const renderCreateRoomScreen = () => (
        <div>
            <h2>部屋を作成</h2>
            <input
                type="text"
                placeholder="部屋IDを入力"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={createRoom}>部屋を作る</button>
            <button onClick={() => setGameState("joinRoom")}>部屋に参加</button>
        </div>
    );

    const renderJoinRoomScreen = () => (
        <div>
            <h2>部屋に参加</h2>
            <input
                type="text"
                placeholder="プレイヤー名を入力"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
            />
            <button onClick={joinRoom}>部屋に参加</button>
        </div>
    );

    const renderGameScreen = () => (
        <div>
            <h2>ゲーム画面</h2>
            <button onClick={startGame}>ゲーム開始</button>
            <button onClick={drawCard}>カードを引く</button>
            <h3>現在のカード: {currentCard}</h3>
            <input
                type="text"
                placeholder="オノマトペを入力"
                value={onomatopoeia}
                onChange={(e) => setOnomatopoeia(e.target.value)}
            />
            <button onClick={submitOnomatopoeia}>オノマトペを送信</button>
            <h3>プレイヤーリスト</h3>
            <ul>
                {players.map((player, index) => (
                    <li key={index}>{player.name}</li>
                ))}
            </ul>
        </div>
    );

    // 画面遷移のロジック
    return (
        <div>
            {gameState === "title" && renderTitleScreen()}
            {gameState === "createRoom" && renderCreateRoomScreen()}
            {gameState === "joinRoom" && renderJoinRoomScreen()}
            {gameState === "game" && renderGameScreen()}
        </div>
    );
}
