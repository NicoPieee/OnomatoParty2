// pages/index.tsx
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify"; // Toastify を利用
import TitleScreen from "../components/TitleScreen";
import CreateRoomScreen from "../components/CreateRoomScreen";
import JoinRoomScreen from "../components/JoinRoomScreen";
import WaitingScreen from "../components/WaitingScreen";
import GameScreen from "../components/GameScreen";
import GameOverScreen from "../components/GameOverScreen";

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
  const [winners, setWinners] = useState(null);
  const [parentPlayer, setParentPlayer] = useState(null);
  const [gameState, setGameState] = useState("title");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasDrawnCard, setHasDrawnCard] = useState(false);
  const [onomatopoeiaList, setOnomatopoeiaList] = useState([]);
  const [deckName, setDeckName] = useState("Stone");
  const [usageStats, setUsageStats] = useState(null); // 追加：使用頻度情報

  useEffect(() => {
    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_SERVER || "http://localhost:5001"
    );

    socketRef.current.on("connect", () => {
      setMyId(socketRef.current.id);
    });

    socketRef.current.on("onomatopoeiaList", (list) => {
      setOnomatopoeiaList(list);
    });

    socketRef.current.on("updatePlayers", setPlayers);

    socketRef.current.on("gameStarted", (player) => {
      setParentPlayer(player);
      setGameState("game");
    });

    socketRef.current.on("updateRoomInfo", (roomInfo) => {
      setDeckName(roomInfo.deckName);
    });

    socketRef.current.on("cardDrawn", setCurrentCard);

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
      setOnomatopoeiaList([]);
    });

    socketRef.current.on("onomatopoeiaChosen", (data) => {
      setPlayers(data.updatedPlayers);
      if (data.chosenPlayers && data.chosenPlayers.length > 0) {
        toast.success(`${data.chosenPlayers.join(", ")} がポイントを獲得しました！`, {
          className: "custom-toast",
          icon: <span>🎉</span>,
        });
      }
    });

    // 修正：gameOver イベントで usageStats も受け取る
    socketRef.current.on("gameOver", ({ winners, players, usageStats }) => {
      setWinners(winners);
      setPlayers(players);
      setUsageStats(usageStats);
      setGameState("gameOver");
      setCurrentCard(null);
    });

    socketRef.current.emit("getRooms");

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const createAndJoinRoom = () => {
    if (!roomId || !playerName) return;
    socketRef.current.emit("createRoom", { roomId, playerName, deckName });
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
      // playerName を追加送信
      socketRef.current.emit("submitOnomatopoeia", roomId, onomatopoeia, playerName);
      setOnomatopoeia("");
    }
  };

  const chooseOnomatopoeia = (selectedOnomatopoeia) => {
    socketRef.current.emit("chooseOnomatopoeia", roomId, selectedOnomatopoeia);
    setOnomatopoeiaList([]);
  };

  const refreshRooms = () => {
    socketRef.current.emit("getRooms");
  };

  const handleTurnTimeout = () => {
    socketRef.current.emit("nextTurn", roomId);
  };

  return (
    <>
      {errorMessage && <div className="error">{errorMessage}</div>}
      {(gameState === "title" ||
        gameState === "createRoom" ||
        gameState === "joinRoom" ||
        gameState === "waiting") ? (
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
              deckName={deckName}
              onPlayerNameChange={(e) => setPlayerName(e.target.value)}
              onDeckChange={(e) => setDeckName(e.target.value)}
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
        </div>
      ) : (
        <div className="container">
          {gameState === "game" && (
            <GameScreen
              players={players}
              parentPlayer={parentPlayer}
              myId={myId}
              myName={playerName} // ここで myName を渡す
              currentCard={currentCard}
              onDrawCard={drawCard}
              hasDrawnCard={hasDrawnCard}
              onSendOnomatopoeia={submitOnomatopoeia}
              onOnomatopoeiaChange={(e) => setOnomatopoeia(e.target.value)}
              onomatopoeia={onomatopoeia}
              onTurnTimeout={handleTurnTimeout}
              socketRef={socketRef}
              onomatopoeiaList={onomatopoeiaList}
              onChooseOnomatopoeia={chooseOnomatopoeia}
              deckName={deckName}
            />
          )}
          {gameState === "gameOver" && (
            <GameOverScreen
              winners={winners}
              players={players}
              usageStats={usageStats} // ここで usageStats を渡す
              onReset={() => {
                setGameState("title");
                setPlayers([]);
                setWinners(null);
                setUsageStats(null);
                setCurrentCard(null);
                setRoomId("");
                setPlayerName("");
                setOnomatopoeia("");
                setHasDrawnCard(false);
                setOnomatopoeiaList([]);
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
