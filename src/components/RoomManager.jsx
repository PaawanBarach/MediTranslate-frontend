import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, Copy, Check, LogIn, Trash2, Share2, Lock } from 'lucide-react';
import { generateEncryptionKey, exportKey, generateShareToken, hasRoomKey } from '@/utils/encryption';

export default function RoomManager({ roomCode, onRoomChange }) {
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

  useEffect(() => {
    // Check if current room has encryption key
    if (roomCode && roomCode !== 'DEMO') {
      setIsEncrypted(hasRoomKey(roomCode));
    } else {
      setIsEncrypted(false);
    }
  }, [roomCode]);

  const generateShareLink = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Get or create encryption key
      const key = await generateEncryptionKey();
      const keyString = await exportKey(key);
      
      // Store key locally
      localStorage.setItem(`room_key_${roomCode}`, keyString);
      
      // Generate token
      const token = generateShareToken(roomCode, keyString);
      
      // Sign token with backend
      const response = await fetch(`${apiUrl}/api/rooms/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!response.ok) throw new Error('Failed to sign token');
      
      const { signature } = await response.json();
      
      // Build shareable link
      const link = `${window.location.origin}/#t=${token}&s=${signature}`;
      setShareLink(link);
      setShowShareDialog(true);
      setIsEncrypted(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createNewRoom = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/rooms/create`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to create room');
      
      const data = await response.json();
      onRoomChange(data.room_code);
      
      // Auto-generate share link for new room
      setTimeout(() => generateShareLink(), 500);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room');
    }
  };

  const joinRoom = () => {
    if (!joinCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    
    const code = joinCode.trim().toUpperCase();
    onRoomChange(code);
    setJoinCode('');
    setShowJoinDialog(false);
  };

  const goToDemo = () => {
    if (roomCode !== 'DEMO') {
      if (confirm('Switch to demo room? Your current room data will not be lost.')) {
        onRoomChange('DEMO');
      }
    }
  };

  const clearRoomData = async () => {
    if (roomCode === 'DEMO') {
      alert('Cannot delete demo room');
      return;
    }

    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete ALL conversations in room "${roomCode}".\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure?`
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      `Last chance: Delete EVERYTHING in room ${roomCode}?`
    );

    if (!doubleConfirm) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/rooms/${roomCode}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete room');

      // Clear encryption key
      localStorage.removeItem(`room_key_${roomCode}`);
      
      alert('Room data deleted successfully');
      onRoomChange('DEMO');
    } catch (error) {
      console.error('Failed to delete room:', error);
      alert('Failed to delete room data');
    }
  };

  const isDemoRoom = roomCode?.toUpperCase() === 'DEMO';

  return (
    <div className="space-y-2">
      {/* Room Code Display */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
              {isDemoRoom ? (
                'Demo Room (Read-only)'
              ) : (
                <>
                  {isEncrypted && <Lock className="w-3 h-3 text-green-600" />}
                  {isEncrypted ? 'Encrypted Room' : 'Your Room Code'}
                </>
              )}
            </div>
            <div className="font-mono font-bold text-lg text-blue-700 truncate">
              {roomCode}
            </div>
          </div>
          
          {!isDemoRoom && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomCode}
                className="shrink-0"
                title="Copy room code"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateShareLink}
                className="shrink-0"
                title="Generate secure share link"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Share Link Dialog */}
      {showShareDialog && (
        <Card className="p-3 space-y-2 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Secure Share Link</span>
          </div>
          
          <div className="text-xs text-green-700 space-y-1">
            <p>✅ End-to-end encrypted</p>
            <p>✅ Link expires in 30 days</p>
            <p>⚠️ Share via secure channels (WhatsApp, Signal)</p>
          </div>
          
          <div className="p-2 bg-white rounded border text-xs break-all font-mono">
            {shareLink}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={copyShareLink} size="sm" className="flex-1">
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowShareDialog(false)} 
              variant="outline" 
              size="sm"
            >
              Close
            </Button>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isDemoRoom ? (
          <Button onClick={createNewRoom} className="flex-1" size="sm">
            Create Secure Room
          </Button>
        ) : (
          <>
            <Button onClick={goToDemo} variant="outline" size="sm" className="flex-1">
              <Home className="w-4 h-4 mr-1" />
              Demo
            </Button>
            <Button onClick={clearRoomData} variant="destructive" size="sm" className="flex-1">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </>
        )}
        
        <Button 
          onClick={() => setShowJoinDialog(!showJoinDialog)} 
          variant="outline" 
          size="sm"
        >
          <LogIn className="w-4 h-4 mr-1" />
          Join
        </Button>
      </div>

      {/* Join Room Dialog */}
      {showJoinDialog && (
        <Card className="p-3 space-y-2">
          <div className="text-sm font-medium">Join Existing Room</div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="SWIFT-TIGER-1234"
            className="w-full px-3 py-2 border rounded text-sm font-mono"
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <div className="flex gap-2">
            <Button onClick={joinRoom} size="sm" className="flex-1">
              Join Room
            </Button>
            <Button 
              onClick={() => setShowJoinDialog(false)} 
              variant="outline" 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
