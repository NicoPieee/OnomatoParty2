// components/TitleScreen.tsx
export default function TitleScreen({ onCreateRoom, onJoinRoom }) {
    return (
      <div className="screen">
        <h1>OnomatoParty2</h1>
        <button onClick={onCreateRoom}>部屋を作成</button>
        <button onClick={onJoinRoom}>部屋に参加</button>
      </div>
    );
  }
  