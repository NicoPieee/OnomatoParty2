import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function Home() {
    const socketRef = useRef(null);
    const [roomId, setRoomId] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = io("http://localhost:5000");

            socketRef.current.on("updatePlayers", (players) => {
                setPlayers(players);
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
    };

    const joinRoom = () => {
        if (!roomId || !playerName) return;
        socketRef.current.emit("joinRoom", { roomId, playerName });
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>OnomatoParty2</h1>

            <div>
                <input
                    type="text"
                    placeholder="部屋IDを入力"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <button onClick={createRoom}>部屋を作る</button>
            </div>

            <div style={{ marginTop: "20px" }}>
                <input
                    type="text"
                    placeholder="プレイヤー名を入力"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
                <button onClick={joinRoom}>部屋に参加</button>
            </div>

            <div style={{ marginTop: "20px" }}>
                <h2>部屋のプレイヤー</h2>
                <ul>
                    {players.map((player, index) => (
                        <li key={index}>{player.name}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
