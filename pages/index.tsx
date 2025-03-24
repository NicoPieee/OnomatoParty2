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
  const [gameState, setGameState] = useState("title");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (gameState === "createRoom") {
      setRoomId(generateRoomId());
    }
  }, [gameState]);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("connect", () => {
      setMyId(socketRef.current.id);
    });

    socketRef.current.on("updatePlayers", setPlayers);

    socketRef.current.on("gameStarted", (player) => {
      alert(`${player.name}が親プレイヤーになったよ！`);
      setParentPlayer(player);
      setGameState("game");
    });

    socketRef.current.on("cardDrawn", setCurrentCard);

    socketRef.current.on("roomsList", setAvailableRooms);

    socketRef.current.on("error", (message) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    socketRef.current.on("newTurn", (nextParentPlayer) => {
      alert(`次は${nextParentPlayer.name}が親プレイヤーだよ！`);
      setParentPlayer(nextParentPlayer);
      setCurrentCard(null);
      setOnomatopoeia("");
    });

    socketRef.current.on("onomatopoeiaChosen", (data) => {
      alert(`${data.chosenPlayer.name}の「${data.onomatopoeia}」が選ばれたよ！`);
      setPlayers(data.updatedPlayers);
    });

    socketRef.current.on("gameOver", (winnerData) => {
      setWinner(winnerData);
      setGameState("gameOver");
      alert(`ゲーム終了！優勝は${winnerData.name}だよ！おめでとう！`);
    });

    socketRef.current.emit("getRooms");

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const createAndJoinRoom = () => {
    if (!roomId || !playerName) return;
    socketRef.current.emit("createRoom", { roomId, playerName });
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
      setOnomatopoeia("");
    }
  };

  const refreshRooms = () => {
    socketRef.current.emit("getRooms");
  };

  const renderTitleScreen = () => (
    <div className="screen">
      <h1>OnomatoParty2</h1>
      <button onClick={() => setGameState("createRoom")}>部屋を作成</button>
      <button onClick={() => setGameState("joinRoom")}>部屋に参加</button>
    </div>
  );

  const renderCreateRoomScreen = () => (
    <div className="screen">
      <h2>部屋を作成</h2>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <p className="room-id">部屋ID: {roomId}</p>
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="プレイヤー名"
      />
      <button onClick={createAndJoinRoom}>作成＆参加</button>
      <button onClick={() => setGameState("title")}>戻る</button>
    </div>
  );

  const renderJoinRoomScreen = () => (
    <div className="screen">
      <h2>部屋に参加</h2>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="部屋ID"
      />
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="プレイヤー名"
      />
      <button onClick={joinRoom}>参加</button>
      <button onClick={refreshRooms}>更新</button>
      <button onClick={() => setGameState("title")}>戻る</button>

      <ul>
        {availableRooms.map((room, index) => (
          <li key={index} onClick={() => setRoomId(room)}>
            {room}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderWaitingScreen = () => (
    <div className="screen">
      <h2>待機画面（部屋ID: {roomId}）</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {player.name} ({player.points}点)
          </li>
        ))}
      </ul>
      {players[0]?.id === myId && (
        <button onClick={startGame}>ゲーム開始</button>
      )}
      <button onClick={() => setGameState("title")}>戻る</button>
    </div>
  );

  const renderGameScreen = () => (
    <div className="game-screen">
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {player.name} ({player.points}点)
            {player.id === parentPlayer?.id ? " [親]" : " [子]"}
          </li>
        ))}
      </ul>
      {currentCard && <img src={`/images/${currentCard}`} alt="カード" />}
      {parentPlayer && myId === parentPlayer.id ? (
        <button onClick={drawCard}>カードを引く</button>
      ) : (
        <>
          <input
            value={onomatopoeia}
            onChange={(e) => setOnomatopoeia(e.target.value)}
            placeholder="オノマトペ"
          />
          <button onClick={submitOnomatopoeia}>送信</button>
        </>
      )}
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
