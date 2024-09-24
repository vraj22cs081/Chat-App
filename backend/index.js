const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');
const User = require('./models/user'); // Import the user model
const authRoutes = require('./routes/auth'); // Import the auth routes
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chatapp')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

// Use the auth routes for signup and login
app.use('/auth', authRoutes);


// Socket.io logic
const users = {};
const rooms = {};

io.on('connection', (socket) => {
  socket.on('create-room', ({ name }) => {
    const roomCode = Math.random().toString(36).substring(2, 8);
    rooms[roomCode] = [];
    users[socket.id] = { name, roomCode };
    rooms[roomCode].push(socket.id);
    socket.join(roomCode);
    socket.emit('room-created', roomCode);
  });

  socket.on('join-room', ({ name, roomCode }) => {
    if (rooms[roomCode]) {
      users[socket.id] = { name, roomCode };
      rooms[roomCode].push(socket.id);
      socket.join(roomCode);
      socket.broadcast.to(roomCode).emit('user-joined', name);
      socket.emit('joined-room');
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  socket.on('send', ({ message, roomCode }) => {
    const user = users[socket.id];
    if (user && user.roomCode === roomCode) {
      socket.broadcast.to(roomCode).emit('receive', { message, name: user.name });
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const { roomCode } = user;
      rooms[roomCode] = rooms[roomCode].filter(id => id !== socket.id);
      if (rooms[roomCode].length === 0) {
        delete rooms[roomCode];
      }
      socket.broadcast.to(roomCode).emit('left', user.name);
      delete users[socket.id];
    }
  });
});

server.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});
