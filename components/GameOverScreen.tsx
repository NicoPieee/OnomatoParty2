// components/GameOverScreen.tsx
import React from "react";

export default function GameOverScreen({ winner, players, onReset }) {
  return (
    <div className="screen game-over-screen">
      <h2>ゲーム終了！</h2>
      {winner ? (
        <>
          <h3>勝者: {winner.name} ({winner.points}点)</h3>
          <h4>最終結果</h4>
          <ul>
            {players.map((player, index) => (
              <li key={index}>
                {player.name} - {player.points}点
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>結果が表示されません。</p>
      )}
      <button onClick={onReset}>タイトルに戻る</button>
    </div>
  );
}
