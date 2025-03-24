// pages/index.tsx
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
  const [socketConnected, setSocketConnected] = useState(false);

  // ソケット初期化と各種イベントハンドラの登録
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("connect", () => {
      setMyId(socketRef.current.id);
      setSocketConnected(true);
    });

    socketRef.current.on("updatePlayers", setPlayers);

    socketRef.current.on("gameStarted", (player) => {
      setParentPlayer(player);
      setGameState("game");
    });

    socketRef.current.on("cardDrawn", (card) => {
      setCurrentCard(card);
    });

    socketRef.current.on("roomsList", setAvailableRooms);

    socketRef.current.on("error", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    socketRef.current.on("newTurn", (nextParentPlayer) => {
      setParentPlayer(nextParentPlayer);
      setCurrentCard(null);
      setOnomatopoeia("");
      setHasDrawnCard(false);
    });

    socketRef.current.on("onomatopoeiaChosen", (data) => {
      setPlayers(data.updatedPlayers);
    });

    socketRef.current.on("gameOver", (winnerData) => {
      setWinner(winnerData);
      setGameState("gameOver");
    });

    socketRef.current.emit("getRooms");

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const createAndJoinRoom = () => {
    if (!roomId || !playerName) return;
    if (!socketRef.current) {
      console.error("Socket is not initialized yet");
      return;
    }
    socketRef.current.emit("createRoom", { roomId, playerName });
    setGameState("waiting");
  };

  const joinRoom = () => {
    if (!roomId || !playerName) return;
    if (!socketRef.current) {
      console.error("Socket is not initialized yet");
      return;
    }
    socketRef.current.emit("joinRoom", { roomId, playerName });
    setGameState("waiting");
  };

  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("startGame", roomId);
    }
  };

  const drawCard = () => {
    if (!hasDrawnCard && socketRef.current) {
      socketRef.current.emit("drawCard", roomId);
      setHasDrawnCard(true);
    }
  };

  const submitOnomatopoeia = () => {
    if (onomatopoeia && socketRef.current) {
      socketRef.current.emit("submitOnomatopoeia", roomId, onomatopoeia);
      setOnomatopoeia("");
    }
  };

  const refreshRooms = () => {
    if (socketRef.current) {
      socketRef.current.emit("getRooms");
    }
  };

  // ターンタイマーで時間切れになったら次のターンへ移行する処理
  const handleTurnTimeout = () => {
    if (socketRef.current) {
      socketRef.current.emit("nextTurn", roomId);
    }
  };

  return (
    <div className="container">
      {gameState === "title" && (
        <TitleScreen 
          onCreateRoom={() => {
            setRoomId(generateRoomId());
            setGameState("createRoom");
          }}
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
          onSendOnomatopoeia={submitOnomatopoeia}
          onOnomatopoeiaChange={(e) => setOnomatopoeia(e.target.value)}
          onomatopoeia={onomatopoeia}
          onTurnTimeout={handleTurnTimeout}
        />
      )}
    </div>
  );
}
