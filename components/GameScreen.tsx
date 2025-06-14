import React, { useState, useEffect } from "react";

interface OnomatopoeiaGroup {
  onomatopoeia: string;
  playerIds: string[];
}

interface GameScreenProps {
  players: any[];
  parentPlayer: any;
  myId: string;
  myName: string;
  currentCard: string | null;
  onDrawCard: () => void;
  hasDrawnCard: boolean;
  onSendOnomatopoeia: () => void;
  onOnomatopoeiaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onomatopoeia: string;
  onTurnTimeout: () => void;
  socketRef: any;
  onomatopoeiaList: OnomatopoeiaGroup[];
  onChooseOnomatopoeia: (selectedOnomatopoeia: string) => void;
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

  // カードが引かれたらタイマーをリセットする
  useEffect(() => {
    if (currentCard) {
      setTimeLeft(60);
      setTimerActive(true);
      setHasSentOnomatopoeia(false);
    } else {
      setTimerActive(false);
    }
  }, [currentCard]);

  // タイマーのカウントダウン処理
  useEffect(() => {
    if (!timerActive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
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
                {onomatopoeiaList.map((group, idx) => (
                  <button key={idx} onClick={() => onChooseOnomatopoeia(group.onomatopoeia)}>
                    {group.onomatopoeia}
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
              onClick={() => {
                onSendOnomatopoeia();
                setHasSentOnomatopoeia(true);
              }}
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
