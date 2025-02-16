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
    const [showNextQuestion, setShowNextQuestion] = useState(false)
    const [showLimitWarning, setShowLimitWarning] = useState(false);


    // Initialize session
    useEffect(() => {
        if ("webkitSpeechRecognition" in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            let timer = null; // ✅ Timer for auto-stop

            recognition.onstart = () => {
                setShowLimitWarning(false); // ✅ Reset warning
                setIsListening(true);

                // ✅ Auto-stop after 45 seconds
                timer = setTimeout(() => {
                    console.log("Max response time reached.");
                    recognition.stop();
                    setShowLimitWarning(true); // ✅ Show warning
                }, 45000);  // 45 seconds in milliseconds
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
                clearTimeout(timer); // ✅ Stop the timer on error
            };

            recognition.onend = () => {
                setIsListening(false);
                clearTimeout(timer); // ✅ Stop the timer when recognition ends
            };

            window.recognition = recognition;
        }
    }, []);


    const startInterview = () => {
        setSessionStarted(true);
        setNextQuestion("This interview consists of 5 questions. You have 45 seconds to answer each question.\n\nFirst question: Tell me about your experience with Python.");
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
                    session_id: sessionId,
                    topic_area: "Python backend development",
                }),
            });

            const data = await res.json();
            console.log("🔥 Full API Response Received in Frontend:", data); // ✅ Debug log

            // ✅ Log each part of the response separately
            console.log("📝 Setting response state:", data.response);
            console.log("❓ Setting next question:", data.next_question);

            // ✅ Ensure response is set only if it exists
            if (data.response) {
                setResponse(data.response);
            } else {
                console.log("⚠️ No response received from API!");
                setResponse("⚠️ No feedback available.");
            }

            // ✅ Ensure next question is set correctly
            if (data.next_question) {
                setNextQuestion(data.next_question);
            } else {
                console.log("⚠️ No next question received!");
            }

            setUserInput(""); // Clear input after submit
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
    <div className="text-white text-lg mb-4">
        <p>{response}</p>
        {nextQuestion && !response.includes(nextQuestion) && (
            <p className="mt-4">{nextQuestion}</p>
        )}
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
                                rows="5"  // ✅ Makes the box bigger for longer answers
                                disabled={!isListening}  // ✅ Completely blocks input until Speak is pressed

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
        </div>
    );
}
