// components/GameOverScreen.tsx（複数勝者対応、安全策付き）
import React from "react";

interface GameOverScreenProps {
  winners: any[];
  players: any[];
  onReset: () => void;
}

export default function GameOverScreen({
  winners,
  players,
  onReset,
}: GameOverScreenProps) {
  return (
    <div className="game-over-screen">
      <h2>ゲーム終了！</h2>
      {winners && winners.length > 0 ? (
        winners.length === 1 ? (
          <h3>勝者: {winners[0].name}（{winners[0].points} 点）</h3>
        ) : (
          <>
            <h3>引き分け！勝者：</h3>
            <ul>
              {winners.map((winner, index) => (
                <li key={index}>
                  {winner.name}（{winner.points} 点）
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <h3>勝者情報がありません</h3>
      )}

      <h4>全プレイヤーの最終スコア：</h4>
      <ul>
        {(players && players.length > 0) ? (
          players.map((player, index) => (
            <li key={index}>
              {player.name} ({player.points} 点)
            </li>
          ))
        ) : (
          <li>プレイヤー情報がありません</li>
        )}
      </ul>

      <button onClick={onReset}>タイトルに戻る</button>
    </div>
  );
}
