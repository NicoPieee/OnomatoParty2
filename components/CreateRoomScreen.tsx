// components/CreateRoomScreen.tsx（完全版）
export default function CreateRoomScreen({
  roomId,
  playerName,
  deckName,
  onPlayerNameChange,
  onDeckChange,
  onCreateAndJoin,
  onBack,
  errorMessage,
}) {
  return (
    <div className="screen">
      <h1>ルームを作成</h1>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <p className="room-id">ルームID: {roomId}</p>
      <input
        value={playerName}
        onChange={onPlayerNameChange}
        placeholder="プレイヤー名"
      />

      {/* デッキ選択部分：カード形式 */}
      <div className="deck-selection">
        <div
          className={`deck-card stone-deck ${
            deckName === "Stone" ? "selected" : ""
          }`}
          onClick={() => onDeckChange({ target: { value: "Stone" } })}
        >
          <div className="deck-title">石のデッキ</div>
        </div>
        <div
          className={`deck-card water-deck ${
            deckName === "Water" ? "selected" : ""
          }`}
          onClick={() => onDeckChange({ target: { value: "Water" } })}
        >
          
          <div className="deck-title">水のデッキ</div>
        </div>
      </div>

      <button onClick={onCreateAndJoin}>作成＆参加</button>
      <button onClick={onBack}>戻る</button>
    </div>
  );
}
