import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const generateRoomId = () => {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
};

export default function Home() {
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [onomatopoeia, setOnomatopoeia] = useState("");
  const [winner, setWinner] = useState(null);
  const [gameState, setGameState] = useState("title"); // "title", "createRoom", "joinRoom", "waiting", "game", "gameOver"
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // 自動生成の処理：createRoom画面に入ったら部屋IDを生成
  useEffect(() => {
    if (gameState === "createRoom") {
      setRoomId(generateRoomId());
    }
  }, [gameState]);

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

      socketRef.current.on("gameOver", (winnerData) => {
        console.log("ゲーム終了イベント受信:", winnerData);
        setWinner(winnerData);
        setGameState("gameOver");
      });

      socketRef.current.on("roomsList", (rooms) => {
        setAvailableRooms(rooms);
      });

      socketRef.current.on("error", (message) => {
        console.error("Error: ", message);
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(""), 3000);
      });

      // 初回にルーム一覧を取得
      socketRef.current.emit("getRooms");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 部屋作成と自動参加を同時に行う関数
  const createAndJoinRoom = () => {
    if (!roomId || !playerName) return;
    socketRef.current.emit("createRoom", roomId);
    socketRef.current.emit("joinRoom", { roomId, playerName });
    setGameState("waiting");
  };

  const joinRoom = () => {
    if (!roomId || !playerName) return;
    socketRef.current.emit("joinRoom", { roomId, playerName });
    setGameState("waiting");
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

  const refreshRooms = () => {
    socketRef.current.emit("getRooms");
  };

  const renderTitleScreen = () => (
    <div>
      <h1>OnomatoParty2</h1>
      <button onClick={() => setGameState("createRoom")}>部屋を作成</button>
      <button onClick={() => setGameState("joinRoom")}>部屋に参加</button>
    </div>
  );

  const renderCreateRoomScreen = () => (
    <div>
      <h2>部屋を作成</h2>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <p>自動生成された部屋ID: {roomId}</p>
      <input
        type="text"
        placeholder="プレイヤー名を入力"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button onClick={createAndJoinRoom}>部屋を作成＆自動参加</button>
      <button onClick={() => setGameState("title")}>戻る</button>
    </div>
  );

  const renderJoinRoomScreen = () => (
    <div>
      <h2>部屋に参加</h2>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <input
        type="text"
        placeholder="部屋IDを入力または選択"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <input
        type="text"
        placeholder="プレイヤー名を入力"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button onClick={joinRoom}>部屋に参加</button>
      <button onClick={refreshRooms}>ルーム一覧を更新</button>
      <div>
        <h3>利用可能な部屋</h3>
        <ul>
          {availableRooms.length > 0 ? (
            availableRooms.map((room, index) => (
              <li
                key={index}
                onClick={() => setRoomId(room)}
                style={{ cursor: "pointer" }}
              >
                {room}
              </li>
            ))
          ) : (
            <li>利用可能な部屋はありません</li>
          )}
        </ul>
      </div>
      <button onClick={() => setGameState("title")}>戻る</button>
    </div>
  );

  const renderWaitingScreen = () => (
    <div>
      <h2>待機画面</h2>
      <p>部屋ID: {roomId}</p>
      <p>参加者:</p>
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {player.name} {player.isCPU ? "(Bot)" : ""}
          </li>
        ))}
      </ul>
      <button onClick={startGame}>ゲーム開始</button>
    </div>
  );

  const renderGameScreen = () => (
    <div>
      <h2>ゲーム画面</h2>
      <button onClick={startGame}>ゲーム開始</button>
      <button onClick={drawCard}>カードを引く</button>
      <h3>現在のカード:</h3>
      {currentCard && (
        <img
          src={`/images/${currentCard}`}
          alt="現在のカード"
          style={{ width: "300px", height: "auto" }}
        />
      )}
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
      {gameState === "gameOver" && winner && (
        <div>
          <h2>ゲーム終了</h2>
          <h3>勝者: {winner.name}</h3>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {gameState === "title" && renderTitleScreen()}
      {gameState === "createRoom" && renderCreateRoomScreen()}
      {gameState === "joinRoom" && renderJoinRoomScreen()}
      {gameState === "waiting" && renderWaitingScreen()}
      {(gameState === "game" || gameState === "gameOver") && renderGameScreen()}
    </div>
  );
}
