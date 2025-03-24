// components/WaitingScreen.tsx
export default function WaitingScreen({ roomId, players, myId, onStartGame, onBack }) {
    return (
      <div className="screen">
        <h2>待機画面（部屋ID: {roomId}）</h2>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.name} ({player.points}点)
            </li>
          ))}
        </ul>
        {players[0]?.id === myId && (
          <button onClick={onStartGame}>ゲーム開始</button>
        )}
        <button onClick={onBack}>戻る</button>
      </div>
    );
  }
  