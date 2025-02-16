import {useState, useEffect} from "react";
import {v4 as uuidv4} from "uuid";

export default function Home() {
    const [sessionStarted, setSessionStarted] = useState(false);
    const [response, setResponse] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [difficulty, setDifficulty] = useState(1.0);
    const [nextQuestion, setNextQuestion] = useState("");
    const [showNextQuestion, setShowNextQuestion] = useState(false);

    // Initialize session
useEffect(() => {
  if ("webkitSpeechRecognition" in window) {
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;  // ✅ Keeps listening
    recognition.interimResults = true;  // ✅ Shows words while speaking

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript + " ";
        }
      }

      // ✅ Updates the text box live
      setUserInput(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      console.log("Speech recognition stopped.");
      setIsListening(false);
    };

    window.recognition = recognition;
  }
}, []);



    const startInterview = () => {
        setSessionStarted(true);
        setNextQuestion("Tell me about your experience with Python.");
    };

const handleSubmit = async (text) => {
  text = text ?? userInput;

  console.log("Submitting:", text);

  if (!text.trim()) {
    console.log("Invalid input, skipping submit.");
    return;
  }

  stopSpeaking();

  try {
    const res = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        session_id: sessionId,
        topic_area: "Python backend development",
      }),
    });

    console.log("Response received:", res);

    if (!res.ok) throw new Error(`Failed to fetch response: ${res.status}`);

    const data = await res.json();
    console.log("Data received:", data);

    setResponse(data.response);
    setNextQuestion(data.next_question);

    // ✅ Clears the text box when a new question appears
    setUserInput("");
  } catch (error) {
    console.error("API Error:", error);
    setResponse("Error processing response.");
  }
};




    const handleNextQuestion = () => {
        setResponse("");
        setUserInput("");
        setShowNextQuestion(false);
    };

    const toggleListening = () => {
        if (!window.recognition) return;
        if (isListening) {
            window.recognition.stop();
        } else {
            window.recognition.start();
        }
        setIsListening(!isListening);
    };

    const speak = (text) => {
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    };

    return (
        <div
            className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
            {!sessionStarted ? (
                <div className="bg-white/20 backdrop-blur-lg p-8 rounded-xl shadow-lg text-center w-96">
                    <h1 className="text-3xl font-extrabold text-white mb-4">AI Interview Assistant</h1>
                    <p className="mb-6 text-gray-300">Get ready for a smart, adaptive interview.</p>
                    <button
                        onClick={startInterview}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                    >
                        Start Interview
                    </button>
                </div>
            ) : (
                <div className="bg-white/20 backdrop-blur-lg p-6 rounded-xl shadow-lg text-gray-900 w-[450px]">
                    <h1 className="text-2xl font-bold text-center text-white mb-4">Interview Session</h1>

                    {response && (
                        <div className="p-4 mb-4 bg-green-100 text-green-900 rounded-lg shadow-md">
                            <h2 className="font-semibold mb-2">Feedback:</h2>
                            <p>{response}</p>
                            <button
                                onClick={() => speak(response)}
                                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Play Feedback
                            </button>
                        </div>
                    )}

                    {!showNextQuestion ? (
                        <>
                            <p className="text-lg font-medium mb-4 text-white">{nextQuestion}</p>
                            <div className="flex gap-4 mb-6">
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                className="w-full p-3 border rounded bg-gray-200 text-gray-900 resize-none"
                                placeholder="Type your response here..."
                                rows="5"  // ✅ Makes the box bigger for longer answers
                            />


                                <button
                                    onClick={toggleListening}
                                    className={`px-4 py-2 rounded ${isListening ? "bg-red-500" : "bg-blue-600"} text-white`}
                                >
                                    {isListening ? "Stop" : "Speak"}
                                </button>
                                <button onClick={() => handleSubmit()}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                                    Submit
                                </button>

                            </div>
                        </>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                            Next Question
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
