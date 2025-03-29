// components/GameScreen.tsx（完全版）
import React, { useState, useEffect } from "react";

interface GameScreenProps {
  players: any[];
  parentPlayer: any;
  myId: string;
  currentCard: string | null;
  onDrawCard: () => void;
  hasDrawnCard: boolean;
  onSendOnomatopoeia: () => void;
  onOnomatopoeiaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onomatopoeia: string;
  onTurnTimeout: () => void;
  socketRef: any;
  onomatopoeiaList: { playerId: string; onomatopoeia: string }[];
  onChooseOnomatopoeia: (playerId: string) => void;
  deckName: string;
}

export default function GameScreen({
  players,
  parentPlayer,
  myId,
  currentCard,
  onDrawCard,
  hasDrawnCard,
  onSendOnomatopoeia,
  onOnomatopoeiaChange,
  onomatopoeia,
  onTurnTimeout,
  onomatopoeiaList,
  onChooseOnomatopoeia,
  deckName,
}: GameScreenProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false); // タイマーを有効にするフラグを追加

  const displayedCard = currentCard ? `/images/${deckName}/${currentCard}` : "/images/fallback.jpg";

  // カードが引かれた時に初めてタイマーを起動
  useEffect(() => {
    if (currentCard) {
      setTimeLeft(60);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [currentCard]);

  useEffect(() => {
    if (!timerActive) return; // タイマーが非アクティブなら処理しない

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTurnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, onTurnTimeout]);

  return (
    <div className="game-screen">
      <div className="sidebar">
        <h3>プレイヤー一覧</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index} className={player.id === parentPlayer?.id ? "parent" : ""}>
              {player.name} ({player.points}点)
              {player.id === parentPlayer?.id ? " [親]" : " [子]"}
            </li>
          ))}
        </ul>
      </div>

      <div className="main">
        <img
          src={displayedCard}  // ← 初期カードが表示される
          alt="カード"
          className="card-img"
        />

        {parentPlayer && myId === parentPlayer.id ? (
          <>
            {!onomatopoeiaList.length ? (
              <>
                <button onClick={onDrawCard} disabled={hasDrawnCard}>
                  カードを引く
                </button>
                {timerActive && <div className="timer">残り時間: {timeLeft}秒</div>}
              </>
            ) : (
              <div className="onomatopoeia-list">
                <h4>オノマトペを選んで！</h4>
                {onomatopoeiaList.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onChooseOnomatopoeia(item.playerId)}
                  >
                    {item.onomatopoeia}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <input
              value={onomatopoeia}
              onChange={onOnomatopoeiaChange}
              placeholder="オノマトペ"
            />
            <button onClick={onSendOnomatopoeia}>送信</button>
            {timerActive && <div className="timer">残り時間: {timeLeft}秒</div>}
          </>
        )}
      </div>
    </div>
  );
}
