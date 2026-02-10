import { useState, useEffect } from "react";
import ConversationList from "./components/Sidebar/ConversationList";
import ChatInterface from "./components/Chat/ChatInterface";
import { Toaster } from "./components/ui/toaster";
import { parseShareToken, storeRoomKey } from "./utils/encryption";

function App() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("DEMO");
  const [tokenData, setTokenData] = useState(null);

  // Handle share links on mount
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const token = params.get("t");
    const signature = params.get("s");

    if (token && signature) {
      try {
        const data = parseShareToken(token);

        storeRoomKey(data.room, data.key);

        setRoomCode(data.room.toLowerCase()); // Normalize here too
        setTokenData({ token, signature });

        window.history.replaceState(null, "", window.location.pathname);

        alert(`Joined encrypted room: ${data.room}`);
      } catch (error) {
        console.error("Invalid share link:", error);
        alert("Invalid share link");
      }
    } else {
      const savedRoom = localStorage.getItem("medi_room_code");
      if (savedRoom) {
        setRoomCode(savedRoom.toLowerCase()); // Normalize here too
      }
    }
  }, []);

  // Save room to localStorage when it changes
  const handleRoomChange = (newRoomCode) => {
    const normalizedCode = newRoomCode.toLowerCase();
    setRoomCode(normalizedCode);
    localStorage.setItem("medi_room_code", normalizedCode);
    setSelectedConversation(null);
    setTokenData(null);
  };

  const handleConversationUpdate = (updatedConv) => {
    setSelectedConversation(updatedConv);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster />

      <div className="flex-1 flex overflow-hidden">
        <ConversationList
          roomCode={roomCode}
          tokenData={tokenData}
          onRoomChange={handleRoomChange}
          onSelectConversation={setSelectedConversation}
          selectedId={selectedConversation?.id}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <ChatInterface
          conversation={selectedConversation}
          roomCode={roomCode}
          tokenData={tokenData}
          onConversationUpdate={handleConversationUpdate}
          setIsMobileOpen={setIsMobileOpen}
        />
      </div>
    </div>
  );
}

export default App;
