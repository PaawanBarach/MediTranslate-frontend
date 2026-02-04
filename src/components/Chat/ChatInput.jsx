import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Send, Square, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatInput({ conversationId, role, sourceLang, targetLang, onMessageSent }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPreview, setAudioPreview] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an audio file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Audio file must be less than 10MB',
        variant: 'destructive'
      });
      return;
    }

    const audioBlob = new Blob([await file.arrayBuffer()], { type: file.type });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    setAudioPreview({
      blob: audioBlob,
      url: audioUrl,
      filename: file.name
    });

    event.target.value = '';
  };

  const cancelAudioPreview = () => {
    if (audioPreview?.url) {
      URL.revokeObjectURL(audioPreview.url);
    }
    setAudioPreview(null);
  };

  const confirmSendAudio = async () => {
    if (!audioPreview) return;
    await sendAudioMessage(audioPreview.blob, 0);
    cancelAudioPreview();
  };

  const sendAudioMessage = async (audioBlob, duration) => {
    if (!conversationId) return;

    setIsSending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      
      let filename = 'recording.webm';
      if (audioBlob.type.includes('mp3')) filename = 'audio.mp3';
      else if (audioBlob.type.includes('wav')) filename = 'audio.wav';
      else if (audioBlob.type.includes('m4a')) filename = 'audio.m4a';
      else if (audioBlob.type.includes('ogg')) filename = 'audio.ogg';
      
      formData.append('audio', audioBlob, filename);
      formData.append('role', role);
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);

      const response = await fetch(`${apiUrl}/api/conversations/${conversationId}/audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process audio');
      }

      const message = await response.json();
      onMessageSent(message);
      
      toast({
        title: 'Audio processed',
        description: duration > 0 ? `Recording (${duration}s) sent successfully` : 'Audio file uploaded successfully'
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send audio message',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-3 lg:p-4 border-t bg-white">
      {/* Audio Preview */}
      {audioPreview && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Audio Ready to Send</span>
          </div>
          <audio src={audioPreview.url} controls className="w-full mb-2 h-8" />
          <p className="text-xs text-gray-600 mb-2 truncate">{audioPreview.filename}</p>
          <div className="flex gap-2">
            <Button 
              onClick={confirmSendAudio}
              disabled={isSending}
              size="sm"
              className="flex-1"
            >
              <Send className="w-3 h-3 mr-1" />
              Send Audio
            </Button>
            <Button 
              onClick={cancelAudioPreview}
              disabled={isSending}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Input Controls */}
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
          className="min-h-[60px] resize-none text-sm"
          disabled={isSending || isRecording || !conversationId || audioPreview}
        />
        
        <div className="flex gap-2">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isRecording || !conversationId || audioPreview}
            title="Upload audio file"
            className="h-[60px] w-12 lg:w-14"
          >
            <Upload className="w-4 h-4" />
          </Button>

          {/* Record Button */}
          <Button
            size="icon"
            variant={isRecording ? 'destructive' : 'outline'}
            onMouseDown={isRecording ? stopRecording : startRecording}
            disabled={isSending || !conversationId || audioPreview}
            title="Record audio"
            className="h-[60px] w-12 lg:w-14"
          >
            {isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            size="icon"
            onClick={sendTextMessage}
            disabled={!text.trim() || isSending || !conversationId || audioPreview}
            title="Send text message"
            className="h-[60px] w-12 lg:w-14"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="text-sm text-red-500 mt-2 text-center flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          Recording... {recordingTime}s
        </div>
      )}

      {/* Processing Status */}
      {isSending && (
        <div className="text-sm text-blue-500 mt-2 text-center flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          Processing audio...
        </div>
      )}
    </div>
  );
}
