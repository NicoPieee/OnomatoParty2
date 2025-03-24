// components/GameScreen.tsx
import React from "react";

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
}

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
}: GameScreenProps) {
  const displayedCard = currentCard || "fallback.jpg";

  return (
    <div className="game-screen">
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {player.name} ({player.points}点)
            {player.id === parentPlayer?.id ? " [親]" : " [子]"}
          </li>
        ))}
      </ul>
      <img src={`/images/${displayedCard}`} alt="カード" className="card-img" />
      {parentPlayer && myId === parentPlayer.id ? (
        <button onClick={onDrawCard} disabled={hasDrawnCard}>
          カードを引く
        </button>
      ) : (
        <>
          <input
            value={onomatopoeia}
            onChange={onOnomatopoeiaChange}
            placeholder="オノマトペ"
          />
          <button onClick={onSendOnomatopoeia}>送信</button>
        </>
      )}
    </div>
  );
}
