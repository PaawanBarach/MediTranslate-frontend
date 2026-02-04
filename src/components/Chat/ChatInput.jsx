import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Send, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatInput({ conversationId, role, sourceLang, targetLang, onMessageSent }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const { toast } = useToast();

  const sendTextMessage = async () => {
    if (!text.trim() || !conversationId) return;

    setIsSending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('role', role);
      formData.append('text', text.trim());
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);

      const response = await fetch(`${apiUrl}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to send message');

      const message = await response.json();
      onMessageSent(message);
      setText('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = recordingTime;
        await sendAudioMessage(audioBlob, duration);
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendAudioMessage = async (audioBlob, duration) => {
    if (!conversationId) return;

    setIsSending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('role', role);
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);

      const response = await fetch(`${apiUrl}/api/conversations/${conversationId}/audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to process audio');

      const message = await response.json();
      onMessageSent(message);
      
      toast({
        title: 'Audio sent',
        description: `Recording (${duration}s) processed successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send audio message',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 border-t bg-white">
      <div className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendTextMessage();
            }
          }}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none"
          disabled={isSending || isRecording || !conversationId}
        />
        
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={isRecording ? 'destructive' : 'outline'}
            onMouseDown={isRecording ? stopRecording : startRecording}
            disabled={isSending || !conversationId}
          >
            {isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          <Button
            size="icon"
            onClick={sendTextMessage}
            disabled={!text.trim() || isSending || !conversationId}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isRecording && (
        <div className="text-sm text-red-500 mt-2 text-center">
          Recording... {recordingTime}s
        </div>
      )}

      {isSending && (
        <div className="text-sm text-blue-500 mt-2 text-center">
          Processing...
        </div>
      )}
    </div>
  );
}
