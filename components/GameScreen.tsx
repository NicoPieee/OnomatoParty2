// components/GameScreen.tsx
import React, { useState, useEffect } from "react";

interface GameScreenProps {
  players: any[];
  parentPlayer: any;
  myId: string;
  currentCard: string | null;
  onDrawCard: () => void;
  onSendOnomatopoeia: () => void;
  onOnomatopoeiaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasDrawnCard: boolean;
  onomatopoeia: string;
  onTurnTimeout: () => void;
}

const TURN_DURATION = 15; // 制限時間（秒）

export default function GameScreen({
  players,
  parentPlayer,
  myId,
  currentCard,
  onDrawCard,
  onSendOnomatopoeia,
  onOnomatopoeiaChange,
  hasDrawnCard,
  onomatopoeia,
  onTurnTimeout,
}: GameScreenProps) {
  const displayedCard = currentCard || "fallback.jpg";
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);

  // ターン開始時にタイマーをリセット
  useEffect(() => {
    setTimeLeft(TURN_DURATION);
  }, [parentPlayer]);

  // タイマーのカウントダウン
  useEffect(() => {
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
  }, [onTurnTimeout]);

  return (
    <div className="game-screen">
      {/* サイドバー：プレイヤーリスト */}
      <div className="sidebar">
        <h3>プレイヤー一覧</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.name} ({player.points}点)
              {player.id === parentPlayer?.id ? " [親]" : " [子]"}
            </li>
          ))}
        </ul>
      </div>
      {/* メインエリア：カードとアクション */}
      <div className="main">
        <img
          src={`/images/${displayedCard}`}
          alt="カード"
          className="card-img"
        />
        {parentPlayer && myId === parentPlayer.id ? (
          <>
            <button onClick={onDrawCard} disabled={hasDrawnCard}>
              カードを引く
            </button>
            <div>残り時間: {timeLeft}秒</div>
          </>
        ) : (
          <>
            <input
              value={onomatopoeia}
              onChange={onOnomatopoeiaChange}
              placeholder="オノマトペ"
            />
            <button onClick={onSendOnomatopoeia}>送信</button>
            <div>残り時間: {timeLeft}秒</div>
          </>
        )}
      </div>
    </div>
  );
}
