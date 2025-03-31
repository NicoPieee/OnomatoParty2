// components/GameScreen.tsx（完全修正版）
import React, { useState, useEffect } from "react";

interface GameScreenProps {
  players: any[];
  parentPlayer: any;
  myId: string;
  myName: string;  // 追加
  currentCard: string | null;
  onDrawCard: () => void;
  hasDrawnCard: boolean;
  onSendOnomatopoeia: () => void; // 元通りprops経由で呼び出し
  onOnomatopoeiaChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // 元通りprops経由
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
  myName,
  currentCard,
  onDrawCard,
  hasDrawnCard,
  onSendOnomatopoeia,
  onOnomatopoeiaChange,
  onomatopoeia,
  onTurnTimeout,
  socketRef,
  onomatopoeiaList,
  onChooseOnomatopoeia,
  deckName,
}: GameScreenProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [hasSentOnomatopoeia, setHasSentOnomatopoeia] = useState(false);

  const displayedCard = currentCard
    ? `/images/${deckName}/${currentCard}`
    : "/images/fallback.jpg";

  useEffect(() => {
    if (currentCard) {
      setTimeLeft(60);
      setTimerActive(true);
      setHasSentOnomatopoeia(false);
    } else {
      setTimerActive(false);
    }
  }, [currentCard]);

  useEffect(() => {
    if (!timerActive) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive]);

  return (
    <div className="game-screen">
      <div className="sidebar">
        <h3>プレイヤー</h3>
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
        <img src={displayedCard} alt="カード" className="card-img" />

        {myId === parentPlayer.id ? (
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
                {onomatopoeiaList.map((item, idx) => (
                  <button key={idx} onClick={() => onChooseOnomatopoeia(item.playerId)}>
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
              placeholder="オノマトペを入力してください"
            />
            <button
              onClick={onSendOnomatopoeia}
              disabled={!currentCard || hasSentOnomatopoeia || !onomatopoeia}
            >
              送信
            </button>
            {timerActive && <div className="timer">残り時間: {timeLeft}秒</div>}
          </>
        )}
      </div>
    </div>
  );
}
