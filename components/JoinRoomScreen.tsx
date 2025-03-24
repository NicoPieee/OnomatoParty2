// components/JoinRoomScreen.tsx
export default function JoinRoomScreen({ roomId, playerName, onRoomIdChange, onPlayerNameChange, onJoin, onRefresh, onBack, availableRooms, errorMessage }) {
    return (
      <div className="screen">
        <h2>部屋に参加</h2>
        {errorMessage && <p className="error">{errorMessage}</p>}
        <input
          value={roomId}
          onChange={onRoomIdChange}
          placeholder="部屋ID"
        />
        <input
          value={playerName}
          onChange={onPlayerNameChange}
          placeholder="プレイヤー名"
        />
        <button onClick={onJoin}>参加</button>
        <button onClick={onRefresh}>更新</button>
        <button onClick={onBack}>戻る</button>
        <ul>
          {availableRooms.map((room, index) => (
            <li key={index} onClick={() => onRoomIdChange({ target: { value: room } })}>
              {room}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  