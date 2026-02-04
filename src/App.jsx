import { useState } from 'react';
import ConversationList from './components/Sidebar/ConversationList';
import ChatInterface from './components/Chat/ChatInterface';
import { Toaster } from './components/ui/toaster';

function App() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleConversationUpdate = (updatedConv) => {
    setSelectedConversation(updatedConv);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationList
        onSelectConversation={setSelectedConversation}
        selectedId={selectedConversation?.id}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <ChatInterface 
        conversation={selectedConversation}
        onConversationUpdate={handleConversationUpdate}
        setIsMobileOpen={setIsMobileOpen}
      />
      <Toaster />
    </div>
  );
}

export default App;
