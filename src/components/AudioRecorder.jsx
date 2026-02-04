import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export default function AudioRecorder({
  onAudioComplete,
  sourceLanguage,
  targetLanguage,
  disabled = false,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Fix: Only close if not already closed
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {
            // Ignore errors
          });
        }
        audioContextRef.current = null;
      }

      clearInterval(timerRef.current);

      setIsRecording(false);
      setWaveformData([]);
    }
  }, [isRecording]);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const normalized = Array.from(dataArray)
      .slice(0, 20)
      .map((val) => val / 255);
    setWaveformData(normalized);

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const setupAudioVisualization = useCallback(
    (stream) => {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      updateWaveform();
    },
    [updateWaveform],
  );

  const processAudio = useCallback(
    async (audioBlob) => {
      setIsProcessing(true);

      try {
        // Use environment variable for API URL
        console.log("ALL ENV VARS:", import.meta.env);
        console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
        console.log("Mode:", import.meta.env.MODE);

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

        console.log("Using API URL:", apiUrl);

        console.log("Processing audio with Groq Whisper...", {
          blobSize: audioBlob.size,
          duration: recordingTime,
          apiUrl: apiUrl,
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("conversation_id", "temp-conversation");
        formData.append("sender_role", "doctor");
        formData.append("source_lang", sourceLanguage);
        formData.append("target_lang", targetLanguage);

        const response = await fetch(`${apiUrl}/api/audio/process`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log("Audio processed successfully:", data);

        onAudioComplete({
          audioUrl: data.audio_url,
          transcript: data.transcript,
          translation: data.translation,
          duration: recordingTime,
        });
      } catch (error) {
        console.error("Error processing audio:", error);

        if (error.message.includes("Failed to fetch")) {
          alert("Cannot connect to backend. Check your internet connection.");
        } else {
          alert(`Error processing audio: ${error.message}`);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [sourceLanguage, targetLanguage, onAudioComplete, recordingTime],
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      console.log("Microphone access granted");

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        console.log("Audio blob created:", {
          size: audioBlob.size,
          type: audioBlob.type,
        });

        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setupAudioVisualization(stream);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);

      if (error.name === "NotAllowedError") {
        alert(
          "Microphone access denied. Please allow microphone in browser settings.",
        );
      } else if (error.name === "NotFoundError") {
        alert("No microphone found. Please connect a microphone.");
      } else {
        alert("Error accessing microphone: " + error.message);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        <div className="flex flex-col items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={24} />
          <p className="text-sm">
            Processing audio... This may take up to 30 seconds
          </p>
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
