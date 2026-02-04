import { useState } from 'react';
import AudioRecorder from './components/AudioRecorder';

function App() {
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [lastResult, setLastResult] = useState(null);

  // This function handles the audio result
  const handleAudioComplete = (data) => {
    console.log('Audio recorded:', data);
    setLastResult(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          MediTranslate - Audio Test
        </h1>
        
        {/* Language Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Source Language
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Speaking: <strong>{sourceLanguage}</strong> → Translation: <strong>{targetLanguage}</strong>
          </p>
        </div>

        {/* Audio Recorder */}
        <AudioRecorder
          onAudioComplete={handleAudioComplete}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />

        {/* Results */}
        {lastResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Result:</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Original:</p>
                <p className="font-medium">{lastResult.transcript}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Translation:</p>
                <p className="font-medium text-blue-600">{lastResult.translation}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Audio:</p>
                <audio controls src={lastResult.audioUrl} className="w-full mt-2" />
              </div>
              
              <div className="text-sm text-gray-500">
                Duration: {lastResult.duration}s
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
