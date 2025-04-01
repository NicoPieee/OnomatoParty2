// components/GameOverScreen.tsx
import React from "react";

interface GameOverScreenProps {
  winners: any[];
  players: any[];
  usageStats: { 
    [playerId: string]: { topWord: string | null; topCount: number }
  } | null;
  onReset: () => void;
}

export default function GameOverScreen({
  winners,
  players,
  usageStats,
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
        {players && players.length > 0 ? (
          players.map((player, index) => {
            // usageStatsから該当プレイヤーの最頻オノマトペを取得
            const stat = usageStats && usageStats[player.id];
            const topWord = stat?.topWord || "(なし)";
            const topCount = stat?.topCount || 0;
            return (
              <li key={index}>
                {player.name} ({player.points} 点)
                {topWord !== "(なし)" && (
                  <span> — 最頻オノマトペ: "{topWord}" x {topCount}回</span>
                )}
              </li>
            );
          })
        ) : (
          <li>プレイヤー情報がありません</li>
        )}
      </ul>

      <button onClick={onReset}>タイトルに戻る</button>
    </div>
  );
}
