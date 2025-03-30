// components/GameScreen.tsx
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
  const [timerActive, setTimerActive] = useState(false);
  const [hasSentOnomatopoeia, setHasSentOnomatopoeia] = useState(false);

  const displayedCard = currentCard
    ? `/images/${deckName}/${currentCard}`
    : "/images/fallback.jpg";

  // カードが引かれた時にタイマーと送信ボタンを初期化
  useEffect(() => {
    if (currentCard) {
      setTimeLeft(60);
      setTimerActive(true);
      setHasSentOnomatopoeia(false); // カードを引いたら送信ボタンも再有効化
    } else {
      setTimerActive(false);
    }
  }, [currentCard]);

  // タイマー処理
  useEffect(() => {
    if (!timerActive) return;
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
        <h3>プレイヤー</h3>
        <ul>
          {players && players.length > 0 ? (
            players.map((player, index) => (
              <li key={index} className={player.id === parentPlayer?.id ? "parent" : ""}>
                {player.name} ({player.points}点)
                {player.id === parentPlayer?.id ? " [親]" : " [子]"}
              </li>
            ))
          ) : (
            <li>プレイヤー情報がありません</li>
          )}
        </ul>
      </div>

      <div className="main">
        <img src={displayedCard} alt="カード" className="card-img" />

        {parentPlayer && myId === parentPlayer.id ? (
          // 親プレイヤー用の画面
          <>
            {!onomatopoeiaList.length ? (
              <>
                <button
                  onClick={onDrawCard}
                  disabled={hasDrawnCard}
                  style={{
                    backgroundColor: hasDrawnCard ? "grey" : "#00BCD4",
                    cursor: hasDrawnCard ? "not-allowed" : "pointer",
                  }}
                >
                  カードを引く
                </button>
                {timerActive && <div className="timer">残り時間: {timeLeft}秒</div>}
              </>
            ) : (
              <div className="onomatopoeia-list">
                <h4>オノマトペを選んで！</h4>
                {onomatopoeiaList.map((item, idx) => (
                  <button key={idx} onClick={() => onChooseOnomatopoeia(item.playerId)}>
                    {item.onomatopoeia}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          // 子プレイヤー用の画面
          <>
            <input
              value={onomatopoeia}
              onChange={onOnomatopoeiaChange}
              placeholder="オノマトペを入力してください"
            />
            <button
              onClick={() => {
                onSendOnomatopoeia();
                setHasSentOnomatopoeia(true);
              }}
              disabled={!currentCard || hasSentOnomatopoeia || !onomatopoeia}
              style={{
                backgroundColor: !currentCard || hasSentOnomatopoeia ? "grey" : "#00BCD4",
                cursor: !currentCard || hasSentOnomatopoeia ? "not-allowed" : "pointer",
              }}
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
