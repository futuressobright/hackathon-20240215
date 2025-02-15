import { useState, useEffect } from 'react';

export default function Home() {
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  // Speech recognition setup (your existing code)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      window.recognition = recognition;
    }
  }, []);

  // Text-to-speech setup
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onend = () => {
        setIsPaused(false);
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

  const handleSubmit = async () => {
    // Stop any ongoing speech before getting new response
    stopSpeaking();
    
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput })
      });
      const data = await res.json();
      setResponse(data.response);
      // Automatically speak the response
      speak(data.response);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          style={{ marginRight: '10px', padding: '5px', width: '300px' }}
        />
        <button 
          onClick={toggleListening}
          style={{ backgroundColor: isListening ? 'red' : 'gray', padding: '5px 10px' }}
        >
          {isListening ? 'Stop' : 'Speak'}
        </button>
        <button 
          onClick={handleSubmit}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Submit
        </button>
      </div>
      {response && (
        <div style={{ marginTop: '20px' }}>
          <div>Response: {response}</div>
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => speak(response)} style={{ marginRight: '10px' }}>
              Play Response
            </button>
            <button onClick={stopSpeaking}>
              Stop Audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
