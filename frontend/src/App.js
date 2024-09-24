import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const socket = io('http://localhost:8000');

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Added email state
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [page, setPage] = useState('login');

  const notificationSound = useRef(new Audio('/chat-ring.mp3'));

  useEffect(() => {
    socket.on('user-joined', (name) => {
      appendMessage(`${name} joined the chat`, 'left');
    });

    socket.on('receive', (data) => {
      appendMessage(`${data.name}: ${data.message}`, 'left');
      playNotificationSound();
    });

    socket.on('left', (name) => {
      appendMessage(`${name} left the chat`, 'left');
    });

    // When a room is created
    socket.on('room-created', (roomCode) => {
      setRoomCode(roomCode); // Display room code in UI
      setIsRoomCreator(true);
      setIsJoined(true);
      console.log(`${username} has created a room with code: ${roomCode}`); // Log the room creator in the console
    });

    // When joined the room successfully
    socket.on('joined-room', () => {
      setIsJoined(true);
      setError('');
    });

    // Handle error messages for room joining
    socket.on('error', (message) => {
      setError(message);
      setIsJoined(false);
    });

    return () => {
      socket.off('user-joined');
      socket.off('receive');
      socket.off('left');
      socket.off('room-created');
      socket.off('joined-room');
      socket.off('error');
    };
  }, [username]);

  const appendMessage = (msg, position) => {
    setMessages((prevMessages) => [...prevMessages, { msg, position }]);
  };

  const playNotificationSound = () => {
    notificationSound.current.play().catch((err) => console.error('Audio playback failed', err));
  };

  const handleCreateRoom = () => {
    socket.emit('create-room', { name: username });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomCode.trim() === '') {
      alert('Please enter a valid room code.');
      return;
    }
    socket.emit('join-room', { name: username, roomCode });
  };

  const handleMessageSubmit = (e) => {
    e.preventDefault();
    appendMessage(`You: ${message}`, 'right');
    socket.emit('send', { message, roomCode });
    setMessage('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/auth/login', { username, password });
      setToken(res.data.token);
      setIsAuthenticated(true);
      setPage('chat');
    } catch (error) {
      console.error(error);
      alert('Invalid login credentials');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/auth/signup', { username, email, password });
      alert('User registered! Please log in.');
      setPage('login');
    } catch (error) {
      console.error(error);
      alert('Error during registration');
    }
  };

  if (page === 'login') {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <button onClick={() => setPage('signup')}>Sign Up</button>
      </div>
    );
  }

  if (page === 'signup') {
    return (
      <div className="signup-container">
        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"  // Added email input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign Up</button>
        </form>
        <button onClick={() => setPage('login')}>Login</button>
      </div>
    );
  }

  return (
    <div className="App">
      {!isJoined ? (
        <div className="room-container">
          <button onClick={handleCreateRoom} className="create-room-btn">Create Room</button>
          <form onSubmit={handleJoinRoom} className="join-room-form">
            <input
              type="text"
              placeholder="Enter room code to join"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
            />
            <button type="submit" className="join-btn">Join Room</button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        <div className="chat-container">
          {isRoomCreator && (
            <div className="room-code-display">
              Room Code: <strong>{roomCode}</strong>
            </div>
          )}
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.position}`}>
                {msg.msg}
              </div>
            ))}
          </div>
          <form onSubmit={handleMessageSubmit} className="message-form">
            <input
              type="text"
              placeholder="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <button type="submit" className="send-btn">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
