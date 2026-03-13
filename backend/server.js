const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck for Railway
app.get('/', (req, res) => res.send('ItuYork Holdem Server OK'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Data file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Helper functions to read/write users
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const configureSockets = require('./socket/handlers');

// We need a shared global state for sessions
let connectedUsers = {};

// Import and configure all socket events
configureSockets(io, connectedUsers);

// Basic login logic still needs to route through here or handlers. Let's move login logic into handlers or keep it separate.
// I'll rewrite server.js slightly to handle global state cleanly.

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
