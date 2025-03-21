import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const generateRoomId = () => {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
};

export default function Home() {
  const socketRef = useRef(null);
  const [myId, setMyId] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [onomatopoeia, setOnomatopoeia] = useState("");
  const [winner, setWinner] = useState(null);
  const [parentPlayer, setParentPlayer] = useState(null);
  const [gameState, setGameState] = useState("title"); // "title", "createRoom", "joinRoom", "waiting", "game", "gameOver"
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // 自動生成：createRoom画面に入ったら部屋IDを生成
  useEffect(() => {
    if (gameState === "createRoom") {
      setRoomId(generateRoomId());
    }
  }, [gameState]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:5000");

      socketRef.current.on("connect", () => {
        setMyId(socketRef.current.id);
      });

      socketRef.current.on("updatePlayers", (players) => {
        setPlayers(players);
      });

      socketRef.current.on("gameStarted", (player) => {
        alert(`${player.name}が親プレイヤーになりました！`);
        setParentPlayer(player);
        setGameState("game");
      });

      socketRef.current.on("cardDrawn", (card) => {
        setCurrentCard(card);
      });

      socketRef.current.on("gameOver", (winnerData) => {
        setWinner(winnerData);
        setGameState("gameOver");
      });

      socketRef.current.on("roomsList", (rooms) => {
        setAvailableRooms(rooms);
      });

      socketRef.current.on("error", (message) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(""), 3000);
      });

      socketRef.current.emit("getRooms");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 部屋作成時は createRoom イベントのみ（サーバー側で自動参加処理を行う）
  const createAndJoinRoom = () => {
    if (!roomId || !playerName) return;
    socketRef.current.emit("createRoom", { roomId, playerName });
    setGameState("waiting");
  };

  // 参加の場合
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

  // 各画面のレンダリング

  const renderTitleScreen = () => (
    <div className="screen">
      <h1>OnomatoParty2</h1>
      <div className="button-group">
        <button onClick={() => setGameState("createRoom")}>部屋を作成</button>
        <button onClick={() => setGameState("joinRoom")}>部屋に参加</button>
      </div>
    </div>
  );

  const renderCreateRoomScreen = () => (
    <div className="screen">
      <h2>部屋を作成</h2>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <p className="room-id">自動生成された部屋ID: {roomId}</p>
      <input
        type="text"
        placeholder="プレイヤー名を入力"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <div className="button-group">
        <button onClick={createAndJoinRoom}>部屋作成＆自動参加</button>
        <button onClick={() => setGameState("title")}>戻る</button>
      </div>
    </div>
  );

  const renderJoinRoomScreen = () => (
    <div className="screen">
      <h2>部屋に参加</h2>
      {errorMessage && <p className="error">{errorMessage}</p>}
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
      <div className="button-group">
        <button onClick={joinRoom}>部屋に参加</button>
        <button onClick={refreshRooms}>ルーム一覧更新</button>
      </div>
      <div className="room-list">
        <h3>利用可能な部屋</h3>
        <ul>
          {availableRooms.length > 0 ? (
            availableRooms.map((room, index) => (
              <li key={index} onClick={() => setRoomId(room)}>
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
    <div className="screen">
      <h2>待機画面</h2>
      <p className="room-id">部屋ID: {roomId}</p>
      <div className="players">
        <h3>参加者</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.name} {player.isCPU ? "(Bot)" : ""}
              {index === 0 && " [部屋作成者]"}
            </li>
          ))}
        </ul>
      </div>
      {players.length > 0 && players[0].id === myId ? (
        <button onClick={startGame} className="start-btn">
          ゲーム開始
        </button>
      ) : (
        <p>部屋作成者の開始待ち...</p>
      )}
      <button onClick={() => setGameState("title")} className="back-btn">
        戻る
      </button>
    </div>
  );

  const renderGameScreen = () => (
    <div className="game-screen">
      <div className="sidebar">
        <h3>プレイヤー</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.name} {player.id === parentPlayer?.id ? "[親]" : "[子]"}
            </li>
          ))}
        </ul>
      </div>
      <div className="main">
        <h3>現在のカード</h3>
        {currentCard ? (
          <img src={`/images/${currentCard}`} alt="現在のカード" className="card-img" />
        ) : (
          <p>カードがありません</p>
        )}
        <div className="action-area">
          {parentPlayer && myId === parentPlayer.id ? (
            <button onClick={drawCard} className="action-btn">
              カードを引く
            </button>
          ) : (
            <div className="child-actions">
              <input
                type="text"
                placeholder="オノマトペを入力"
                value={onomatopoeia}
                onChange={(e) => setOnomatopoeia(e.target.value)}
              />
              <button onClick={submitOnomatopoeia} className="action-btn">
                オノマトペ送信
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  

  return (
    <div className="container">
      {gameState === "title" && renderTitleScreen()}
      {gameState === "createRoom" && renderCreateRoomScreen()}
      {gameState === "joinRoom" && renderJoinRoomScreen()}
      {gameState === "waiting" && renderWaitingScreen()}
      {(gameState === "game" || gameState === "gameOver") && renderGameScreen()}
    </div>
  );
}
