const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sensorRoutes  = require('./routes/sensor');
const commandRoutes = require('./routes/commands');
const plantRoutes   = require('./routes/plant');

const app = express();
const httpServer = http.createServer(app);

// Socket.IO — pushes live data to frontend without polling
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io available to routes
app.set('io', io);

// ---- MIDDLEWARE ----
app.use(cors());
app.use(express.json());

// ---- DB ----
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/plantmonitor')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ---- ROUTES ----
app.use('/api/sensor-data', sensorRoutes);
app.use('/api/commands',    commandRoutes);
app.use('/api/plant',       plantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- SOCKET.IO EVENTS ----
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);

  socket.on('send_command', (data) => {
    // Frontend sends { command, value }
    // Store in pending commands, ESP polls and picks it up
    require('./models/Command').create({
      command: data.command,
      value: data.value,
      executed: false
    }).then(() => {
      console.log('Command queued:', data.command, data.value);
      io.emit('command_queued', data);
    });
  });

  socket.on('disconnect', () => {
    console.log('Frontend disconnected:', socket.id);
  });
});

// ---- START ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Plant Monitor backend running on port ${PORT}`);
});
