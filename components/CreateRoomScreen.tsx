// components/CreateRoomScreen.tsx
export default function CreateRoomScreen({ roomId, playerName, onPlayerNameChange, onCreateAndJoin, onBack, errorMessage }) {
    return (
      <div className="screen">
        <h2>部屋を作成</h2>
        {errorMessage && <p className="error">{errorMessage}</p>}
        <p className="room-id">部屋ID: {roomId}</p>
        <input
          value={playerName}
          onChange={onPlayerNameChange}
          placeholder="プレイヤー名"
        />
        <button onClick={onCreateAndJoin}>作成＆参加</button>
        <button onClick={onBack}>戻る</button>
      </div>
    );
  }
  