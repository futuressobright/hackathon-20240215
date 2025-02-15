import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [difficulty, setDifficulty] = useState(1.0);
  const [nextQuestion, setNextQuestion] = useState('');

  // Initialize session
  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
        // Automatically submit when speech is detected
        handleSubmit(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      window.recognition = recognition;
    }
  }, []);

  // Enhanced text-to-speech with better voice settings
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Customize voice settings
      utterance.rate = 1.0;  // Speed of speech
      utterance.pitch = 1.0; // Pitch of voice
      utterance.volume = 1.0; // Volume
      
      // Try to select a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || voice.name.includes('Natural')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsPaused(false);
        // Automatically start listening for next response
        if (nextQuestion) {
          setTimeout(() => {
            toggleListening();
          }, 1000);
        }
      };

      if (isPaused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPaused(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      window.recognition.stop();
    } else {
      window.recognition.start();
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (text = userInput) => {
    stopSpeaking();
    
    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          session_id: sessionId,
          topic_area: "Python backend development"  // Can make this configurable
        })
      });
      
      const data = await res.json();
      setResponse(data.response);
      setDifficulty(data.difficulty_level);
      setNextQuestion(data.next_question);
      
      // Speak the response followed by the next question
      speak(data.response + (data.next_question ? ". Next question: " + data.next_question : ""));
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + error.message);
      speak('Sorry, there was an error processing your response.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">AI Interview Assistant</h1>
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <p className="text-sm">Current Difficulty: {difficulty.toFixed(2)}</p>
          {nextQuestion && <p className="text-sm mt-2">Next Question: {nextQuestion}</p>}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Type your response or click 'Speak'"
        />
        <button 
          onClick={toggleListening}
          className={`px-4 py-2 rounded ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white`}
        >
          {isListening ? 'Stop' : 'Speak'}
        </button>
        <button 
          onClick={() => handleSubmit()}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Submit
        </button>
      </div>

      {response && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold mb-2">Response:</h2>
          <p className="mb-4">{response}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => speak(response)} 
              className="px-3 py-1 bg-blue-500 text-white rounded"
            >
              Play Response
            </button>
            <button 
              onClick={stopSpeaking}
              className="px-3 py-1 bg-gray-500 text-white rounded"
            >
              Stop Audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
