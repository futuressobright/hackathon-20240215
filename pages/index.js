import {useState, useEffect} from "react";
import {v4 as uuidv4} from "uuid";


const AdaptiveBackground = ({ difficulty = 1.0, children }) => {
    const getBackgroundClass = (level) => {
        if (level <= 0.6) return "bg-gradient-to-br from-green-500 via-green-600 to-blue-600";   // Doing great - cool/calm
        if (level <= 1.0) return "bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700"; // Normal - neutral
        if (level <= 1.4) return "bg-gradient-to-br from-orange-500 via-red-600 to-purple-700";  // Getting challenging
        return "bg-gradient-to-br from-red-600 via-red-800 to-black";                            // Maximum pressure
    };

  return (
    <div className={`flex items-center justify-center min-h-screen ${getBackgroundClass(difficulty)} text-white transition-colors duration-1000`}>
      {children}
    </div>
  );
};

export default function Home() {
    const [sessionStarted, setSessionStarted] = useState(false);
    const [response, setResponse] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [difficulty, setDifficulty] = useState(0.8);
    const [nextQuestion, setNextQuestion] = useState("");
    const [showNextQuestion, setShowNextQuestion] = useState(false);
    const [showLimitWarning, setShowLimitWarning] = useState(false);
    const [interviewComplete, setInterviewComplete] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);


    // Initialize speech recognition
    useEffect(() => {
        if ("webkitSpeechRecognition" in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            let timer = null;

            recognition.onstart = () => {
                setShowLimitWarning(false);
                setIsListening(true);
                timer = setTimeout(() => {
                    recognition.stop();
                    setShowLimitWarning(true);
                }, 45000);
            };

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

                setUserInput(finalTranscript + interimTranscript);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
                clearTimeout(timer);
            };

            recognition.onend = () => {
                setIsListening(false);
                clearTimeout(timer);
            };

            window.recognition = recognition;
        }
    }, []);

    const startInterview = () => {
        const newSessionId = uuidv4(); // Generate unique session ID
        setSessionId(newSessionId); // Set it in state
        setSessionStarted(true);
        setNextQuestion("This interview consists of 5 questions. You have 45 seconds to answer each question.\n\nFirst question: Tell me about your experience playing chess.");
    };

    const handleSubmit = async (text) => {
        text = text ?? userInput;

        if (!text.trim()) {
            console.log("Invalid input, skipping submit.");
            return;
        }

        stopSpeaking();

        try {
            const res = await fetch("http://localhost:8001/api/chat", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    text,
                    session_id: sessionId, // Use the generated session_id
                    topic_area: "Chess expertise",
                    status: "in_progress",
                }),
            });

            const data = await res.json();
            console.log("API Response:", data);
            setDifficulty(data.difficulty_level);  // Add this line


            if (data.status === "complete" || data.response?.includes("Thank you for completing")) {
                console.log("✅ Interview is complete! Setting state...");
                setInterviewComplete(true);
                setNextQuestion(null);
                setResponse("Thank you for completing the interview.");
                setUserInput("");
                return;
            }


            if (data.next_question) {
                setNextQuestion(data.next_question);
                speak(data.next_question);
            }


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
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    };

    console.log("DEBUG STATE:", {
        interviewComplete,
        nextQuestion,
        response
    });


    return (
        <AdaptiveBackground difficulty={difficulty}>

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
            ) : interviewComplete ? (
                <div className="bg-white/20 backdrop-blur-lg p-8 rounded-xl shadow-lg text-center w-96">
                    <h1 className="text-3xl font-extrabold text-white mb-4">Thank You!</h1>
                    <p className="mb-6 text-gray-300">
                        You’ve completed the interview. We appreciate your time!
                    </p>
                    <button
                        onClick={() => window.location.reload()}  // Restart interview
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                    >
                        Return to Home
                    </button>
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
                    >
                        Login to View Your Results!
                    </button>
                </div>
            ) : (
                <div className="bg-white/20 backdrop-blur-lg p-6 rounded-xl shadow-lg text-gray-900 w-[450px]">
                    <h1 className="text-2xl font-bold text-center text-white mb-4">Interview Session</h1>

                    {response && (
                        <div className="text-white text-lg mb-4">
                        <p>{response}</p>
                        </div>
                    )}

                    {!interviewComplete && nextQuestion && (
                        <div className="text-white text-lg mb-4">
                            <p>{nextQuestion}</p>
                        </div>
                    )}


                    {!showNextQuestion ? (
                        <>
                            <div className="flex gap-4 mb-6">
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    className="w-full p-3 border rounded bg-gray-200 text-gray-900 resize-none"
                                    placeholder="Type your response here..."
                                    rows="5"
                                    disabled={isListening}
                                />

                                {showLimitWarning && (
                                    <p className="text-red-500 font-semibold mt-2">
                                        ⚠️ You’ve reached the 45-second limit! Please finish your response.
                                    </p>
                                )}

                                <button
                                    onClick={toggleListening}
                                    className={`px-4 py-2 rounded ${isListening ? "bg-red-500" : "bg-blue-600"} text-white`}
                                >
                                    {isListening ? "Stop" : "Speak"}
                                </button>
                                <button
                                    onClick={() => handleSubmit()}
                                    disabled={!userInput.trim() || isListening}
                                    className={`px-4 py-2 rounded text-white ${
                                        !userInput.trim() || isListening
                                            ? "bg-gray-500 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700"
                                    }`}
                                >
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
        </AdaptiveBackground>
    );
}