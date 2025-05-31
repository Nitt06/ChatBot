import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([{ id: 1, title: "New Chat", messages: [] }]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userId, setUserId] = useState(() => {
    // Generate or retrieve a unique user id for chat history
    let uid = localStorage.getItem("chatbot_user_id");
    if (!uid) {
      uid = "user_" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem("chatbot_user_id", uid);
    }
    return uid;
  });

  const recognition = useRef(null);

  // Load available voices
  useEffect(() => {
    function loadVoices() {
      const synthVoices = speechSynthesis.getVoices();
      setVoices(synthVoices);
    }
    loadVoices();
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Setup speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.lang = "en-US";
      recognition.current.interimResults = false;

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setLastInputWasVoice(true); // mark input as voice
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.current.onend = () => {
        // You can optionally auto-send after voice input ends
        // sendMessage(); // if you want auto-send
      };
    } else {
      recognition.current = null;
      console.warn("Speech Recognition API not supported");
    }
  }, []);

  const startListening = () => {
    if (recognition.current) {
      recognition.current.start();
      setLastInputWasVoice(false); // reset until result comes
      setIsSpeaking(false);
    }
  };

  // Stop speech recognition and synthesis
  const stopAll = () => {
    if (recognition.current) {
      recognition.current.stop();
    }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");

    // If typed manually, mark lastInputWasVoice false
    if (!lastInputWasVoice) {
      setLastInputWasVoice(false);
    }

    // Add user message to current chat
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, { type: "user", text: userMsg }];
          const newTitle = userMsg.length > 20 ? userMsg.slice(0, 17) + "..." : userMsg || "New Chat";
          return { ...chat, messages: updatedMessages, title: newTitle || "New Chat" };
        }
        return chat;
      })
    );


    try {
      // Replace this URL with your backend API endpoint
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, user_id: userId }),
      });
      const data = await res.json();

      // Add bot reply
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, { type: "bot", text: data.reply }] }
            : chat
        )
      );

      // Speak only if last input was voice
      if (lastInputWasVoice) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        if (voices.length > 0 && voices[selectedVoiceIndex]) {
          utterance.voice = voices[selectedVoiceIndex];
        }
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Handle enter key in input
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
      setLastInputWasVoice(false); // typed input, so false
    }
  };

  // Create new chat
  const createNewChat = () => {
    const newId = chats.length ? Math.max(...chats.map((c) => c.id)) + 1 : 1;
    const newChat = { id: newId, title: `Chat ${newId}`, messages: [] };
    setChats([...chats, newChat]);
    setCurrentChatId(newId);
  };

  // Switch chat from sidebar
  const selectChat = (id) => {
    setCurrentChatId(id);
  };

  // Current chat messages
  const currentChat = chats.find((chat) => chat.id === currentChatId);

  function renderMessageText(text) {
    // Convert URLs to clickable links, only if they look like valid URLs
    const urlRegex = /\b((https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;
    return text.split(urlRegex).map((part, i) => {
      if (!part) return null;
      // Only treat as link if it contains a dot and no spaces
      if (part.match(urlRegex) && part.includes('.') && !part.includes(' ')) {
        let href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">{part}</a>
        );
      }
      return part;
    });
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <button onClick={createNewChat} className="new-chat-btn">
          + New Chat
        </button>
        <div className="chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item ${
                chat.id === currentChatId ? "active" : ""
              }`}
              onClick={() => selectChat(chat.id)}
            >
              {chat.title}
            </div>
          ))}
        </div>
        <div className="voice-settings">
          <label>Voice Output:</label>
          <select
            value={selectedVoiceIndex}
            onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
          >
            {voices.map((voice, idx) => (
              <option key={voice.name} value={idx}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      </aside>

      <main className="chat-area">
        <div className="messages">
          {currentChat.messages.length === 0 && (
            <div className="empty-chat">Start chatting...</div>
          )}
          {currentChat.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.type === "user" ? "user-msg" : "bot-msg"}`}
            >
              {msg.type === "bot" ? renderMessageText(msg.text) : msg.text}
            </div>
          ))}
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={sendMessage} disabled={!input.trim()}>
            Send
          </button>
          <button onClick={startListening} disabled={isSpeaking}>
            🎤 Voice Input
          </button>
          <button onClick={stopAll} disabled={!isSpeaking && !(recognition.current?.onstart)}>
            ■ Stop
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
