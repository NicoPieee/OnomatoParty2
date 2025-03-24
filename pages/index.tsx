import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import TitleScreen from "../components/TitleScreen";
import CreateRoomScreen from "../components/CreateRoomScreen";
import JoinRoomScreen from "../components/JoinRoomScreen";
import WaitingScreen from "../components/WaitingScreen";
import GameScreen from "../components/GameScreen";

const generateRoomId = () => {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
};

export default function Home() {
  // ここは今まで通りの状態管理
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
  const [hasDrawnCard, setHasDrawnCard] = useState(false);

  // ... socket 初期化や useEffect の処理はこれまで通り

  // 各イベントハンドラはそのまま
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
    if (!hasDrawnCard) {
      socketRef.current.emit("drawCard", roomId);
      setHasDrawnCard(true);
    }
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

  // 各コンポーネントに必要なイベントハンドラや状態を渡す
  return (
    <div className="container">
      {gameState === "title" && (
        <TitleScreen 
          onCreateRoom={() => setGameState("createRoom")}
          onJoinRoom={() => setGameState("joinRoom")}
        />
      )}
      {gameState === "createRoom" && (
        <CreateRoomScreen 
          roomId={roomId}
          playerName={playerName}
          onPlayerNameChange={(e) => setPlayerName(e.target.value)}
          onCreateAndJoin={createAndJoinRoom}
          onBack={() => setGameState("title")}
          errorMessage={errorMessage}
        />
      )}
      {gameState === "joinRoom" && (
        <JoinRoomScreen 
          roomId={roomId}
          playerName={playerName}
          onRoomIdChange={(e) => setRoomId(e.target.value)}
          onPlayerNameChange={(e) => setPlayerName(e.target.value)}
          onJoin={joinRoom}
          onRefresh={refreshRooms}
          onBack={() => setGameState("title")}
          availableRooms={availableRooms}
          errorMessage={errorMessage}
        />
      )}
      {gameState === "waiting" && (
        <WaitingScreen 
          roomId={roomId}
          players={players}
          myId={myId}
          onStartGame={startGame}
          onBack={() => setGameState("title")}
        />
      )}
      {(gameState === "game" || gameState === "gameOver") && (
        <GameScreen 
        players={players}
        parentPlayer={parentPlayer}
        myId={myId}
        currentCard={currentCard}
        onDrawCard={drawCard}
        hasDrawnCard={hasDrawnCard}
        onSendOnomatopoeia={submitOnomatopoeia}  // 修正：ここを onSendOnomatopoeia に変更
        onOnomatopoeiaChange={(e) => setOnomatopoeia(e.target.value)}
        onomatopoeia={onomatopoeia}
      />
      )}
    </div>
  );
}
