import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function AudioRecorder({ 
  onAudioComplete, 
  sourceLanguage,
  targetLanguage,
  disabled = false 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  // Memoize stopRecording to avoid dependency issues
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      clearInterval(timerRef.current);
      
      setIsRecording(false);
      setWaveformData([]);
    }
  }, [isRecording]);

  useEffect(() => {
    // Initialize Web Speech API
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // eslint-disable-next-line no-undef
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = sourceLanguage === 'English' ? 'en-US' : 'es-ES';
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        transcriptRef.current = transcript;
      };
      
      recognitionRef.current = recognition;
    }

    return () => {
      stopRecording();
    };
  }, [sourceLanguage, stopRecording]);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const normalized = Array.from(dataArray).slice(0, 20).map(val => val / 255);
    setWaveformData(normalized);
    
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const setupAudioVisualization = useCallback((stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 64;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    updateWaveform();
  }, [updateWaveform]);

  const processAudio = useCallback(async (audioBlob) => {
    setIsProcessing(true);

    try {
      const transcript = transcriptRef.current || 'Audio message';
      
      // Upload audio to backend
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('conversation_id', 'temp-id');
      formData.append('sender_role', 'doctor');

      const uploadResponse = await fetch('http://localhost:8000/api/audio/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadResponse.json();

      // Translate transcript
      const translateFormData = new FormData();
      translateFormData.append('transcript', transcript);
      translateFormData.append('source_lang', sourceLanguage);
      translateFormData.append('target_lang', targetLanguage);

      const translateResponse = await fetch('http://localhost:8000/api/audio/transcribe-translate', {
        method: 'POST',
        body: translateFormData
      });
      const translateData = await translateResponse.json();

      onAudioComplete({
        audioUrl: uploadData.audio_url,
        transcript: translateData.transcript,
        translation: translateData.translation,
        duration: recordingTime
      });

      // Reset transcript
      transcriptRef.current = '';

    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceLanguage, targetLanguage, onAudioComplete, recordingTime]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      setupAudioVisualization(stream);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied or not available');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-recorder">
      {isRecording ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-red-500 font-medium flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            Recording... {formatTime(recordingTime)}
          </div>
          
          <div className="flex items-center gap-1 h-12">
            {waveformData.map((value, idx) => (
              <div
                key={idx}
                className="w-1 bg-blue-500 rounded"
                style={{ height: `${Math.max(value * 100, 10)}%` }}
              />
            ))}
          </div>

          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Square size={20} />
            Stop Recording
          </button>
        </div>
      ) : isProcessing ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={20} />
          Processing audio...
        </div>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic size={20} />
          Hold to Record
        </button>
      )}
    </div>
  );
}
