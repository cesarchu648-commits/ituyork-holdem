const { RoomManager } = require('../game/RoomManager');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { return []; }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

module.exports = function configureSockets(io, connectedUsers) {
    const roomManager = new RoomManager(io);

    // Save stats globally whenever a hand finishes
    roomManager.onStatsSync = (roomId, winners, players, tier) => {
        let users = readUsers();
        let updated = false;

        // Process final chip balances for ALL players at the table to ensure persistance
        players.forEach(p => {
            if (p.isBot) return;
            let dbUser = users.find(u => u.username === p.user.username);
            if (dbUser) {
                // If VIP/Torneos, chips won go to Gold. If Pro/Principiante, go to Fichas.
                // Actually they are playing with their stack which is already separated in chips.
                // We'll sync ONLY when they leave, BUT we also want live stats updates for the Inventario!
                // Best is to update their stats tracking here.
                updated = true;
            }
        });

        winners.forEach( w =>
        {
            let dbUser = users.find( u => u.username === w.username );
            if ( dbUser )
            {
                dbUser.handsWon = ( dbUser.handsWon || 0 ) + 1;
                dbUser.totalChipsWon = ( dbUser.totalChipsWon || 0 ) + w.amount;

                // Check for "anuncio con bombos y platillos" when there is only one winner standing
                // This usually happens at the end of a VIP/Tournament session or when everyone else folded/quit
                if ( ( tier === 'VIP' || tier === 'Torneos' ) && players.filter( p => p.chips > 0 ).length === 1 )
                {
                    if ( tier === 'VIP' ) dbUser.vipRoomsWon = ( dbUser.vipRoomsWon || 0 ) + 1;
                    if ( tier === 'Torneos' ) dbUser.tournamentsWon = ( dbUser.tournamentsWon || 0 ) + 1;

                    // Global announcement for the last survivor
                    const announcement = `🎉🏆 ¡ATENCIÓN! ${ dbUser.username.toUpperCase() } HA CONQUISTADO LA SALA ${ tier.toUpperCase() } Y SE LLEVA LA GLORIA! 🏆🎉`;
                    io.emit( 'global_chat_message', {
                        sender: 'SISTEMA',
                        msg: announcement,
                        time: Date.now(),
                        isHighlight: true
                    } );
                    
                    // Also announce to the room so the winner sees it immediately
                    io.to( roomId ).emit( 'room_chat_message', {
                        sender: 'SISTEMA',
                        msg: announcement,
                        time: Date.now()
                    } );

                    // Redrect winner to Lobby after a delay
                    const winnerPlayer = players.find( p => p.user?.username === dbUser.username );
                    if ( winnerPlayer && !winnerPlayer.isBot )
                    {
                        io.to( winnerPlayer.socketId ).emit( 'tournament_ended' );
                    }
                }
            }
        } );

        saveUsers( users );
        // Broadcast user updates so lobby stats update immediately
        for ( let socketId in connectedUsers )
        {
            let st = connectedUsers[ socketId ];
            let dbUser = users.find( u => u.email === st.email );
            if ( dbUser )
            {
                connectedUsers[ socketId ].fichas = dbUser.fichas;
                connectedUsers[ socketId ].gold = dbUser.gold;
                connectedUsers[ socketId ].handsWon = dbUser.handsWon;
                connectedUsers[ socketId ].totalChipsWon = dbUser.totalChipsWon;
                connectedUsers[ socketId ].tournamentsWon = dbUser.tournamentsWon;
                connectedUsers[ socketId ].vipRoomsWon = dbUser.vipRoomsWon;
                io.to( socketId ).emit( 'user_update', connectedUsers[ socketId ] );
            }
        }
    };

    io.on('connection', (socket) => {
        socket.on('login', (data) => {
            const email = (data.email || '').trim();
            const password = (data.password || '').trim();
            let users = readUsers();

            let isAdmin = false;
            if (email === 'ituyork19@gmail.com' && password === 'Humo500_Intwo_1978_Poker') {
                isAdmin = true;
            }

            let user = users.find(u => u.email === email);
            if (!user) {
                if (!isAdmin) {
                    user = {
                        id: Date.now().toString(),
                        email,
                        username: email.split('@')[0],
                        fichas: 1000,
                        gold: 0,
                        handsWon: 0,
                        totalChipsWon: 0,
                        bestHand: 'None',
                        tournamentsWon: 0,
                        vipRoomsWon: 0,
                        level: 1,
                        xp: 0,
                        badges: [],
                        inventory: [],
                        playStats: { aggressiveness: 50, luck: 50, bluff: 50 },
                        lastClaimDate: null,
                        consecutiveDays: 0,
                        isAdmin: false
                    };
                } else {
                    user = {
                        id: 'admin_001',
                        email,
                        username: 'Chu.in.two_Itupoker_078',
                        fichas: 999999999,
                        gold: 999999999,
                        handsWon: 0,
                        totalChipsWon: 0,
                        bestHand: 'Royal Flush',
                        tournamentsWon: 99,
                        vipRoomsWon: 99,
                        level: 100,
                        xp: 999999,
                        badges: ['Developer', 'King'],
                        inventory: ['Golden Card Skin', 'Legendary Aura'],
                        playStats: { aggressiveness: 99, luck: 99, bluff: 99 },
                        lastClaimDate: new Date().toISOString(),
                        consecutiveDays: 7,
                        isAdmin: true
                    };
                }
                users.push(user);
                saveUsers(users);
            } else {
                // Migrate existing users to new schema if needed
                let migrated = false;
                if (user.level === undefined) { user.level = 1; migrated = true; }
                if (user.xp === undefined) { user.xp = 0; migrated = true; }
                if (user.badges === undefined) { user.badges = []; migrated = true; }
                if (user.inventory === undefined) { user.inventory = []; migrated = true; }
                if (user.playStats === undefined) { user.playStats = { aggressiveness: 50, luck: 50, bluff: 50 }; migrated = true; }
                if (user.consecutiveDays === undefined) { user.consecutiveDays = 0; migrated = true; }
                if (isAdmin) {
                    user.isAdmin = true;
                    user.username = 'Chu.in.two_Itupoker_078';
                }
                if (migrated) saveUsers(users);
            }

            // [FIX] Disconnect previous session if it exists to avoid zombies
            const oldSocketId = Object.keys(connectedUsers).find(sid => connectedUsers[sid].email === email);
            if (oldSocketId && oldSocketId !== socket.id) {
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) {
                    oldSocket.emit('error_notification', 'Se ha iniciado sesión desde otro dispositivo.');
                    oldSocket.disconnect(true);
                }
                delete connectedUsers[oldSocketId];
            }

            connectedUsers[socket.id] = { ...user, state: 'Lobby', socketId: socket.id };
            socket.emit('login_success', { user });
            broadcastToAdmins(io, connectedUsers, 'global_session_update', Object.values(connectedUsers));
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            const userState = connectedUsers[socket.id];
            if (userState && userState.roomId) {
                const room = roomManager.rooms.get(userState.roomId);
                if (room) {
                    roomManager.leaveRoom(socket.id, userState.roomId);
                    room.broadcastState();
                }
            }
            delete connectedUsers[socket.id];
            broadcastToAdmins(io, connectedUsers, 'global_session_update', Object.values(connectedUsers));
        });

        socket.on('get_rooms', () => {
            socket.emit('rooms_list', roomManager.getRoomsList());
        });

        socket.on('join_room', (roomId) => {
            const userState = connectedUsers[socket.id];
            if (!userState) return socket.emit('error', 'No logueado');

            let users = readUsers();
            let dbUser = users.find(u => u.email === userState.email);

            const result = roomManager.joinRoom(socket.id, dbUser, roomId);
            if (!result.success) {
                return socket.emit('error_notification', result.msg); // custom neon alert
            }

            // Deduct entry if VIP/Torneos
            const room = roomManager.rooms.get(roomId);
            if (room.tier === 'Principiante' || room.tier === 'Pro') {
                dbUser.fichas -= result.newPlayer.chips;
            } else if (room.tier === 'VIP' || room.tier === 'Torneos') {
                dbUser.gold -= result.newPlayer.chips;
            }
            saveUsers(users);
            userState.fichas = dbUser.fichas;
            userState.gold = dbUser.gold;

            userState.state = 'Room';
            userState.roomId = roomId;
            socket.join(roomId);

            socket.emit('user_update', userState);

            room.broadcastState();
            broadcastToAdmins(io, connectedUsers, 'global_session_update', Object.values(connectedUsers));
        });

        socket.on('leave_room', (roomId) => {
            const userState = connectedUsers[socket.id];
            if (!userState) return;

            const room = roomManager.rooms.get(roomId);
            const res = roomManager.leaveRoom(socket.id, roomId);
            if (res && res.success) {
                let users = readUsers();
                let dbUser = users.find(u => u.email === userState.email);

                if (room.tier === 'Principiante' || room.tier === 'Pro') {
                    dbUser.fichas += res.chipsToReturn;
                } else if (room.tier === 'VIP' || room.tier === 'Torneos') {
                    // Penalty logic for Survivor: keep entry if game started and wait for finish, unless they are eliminated (0 chips) or waiting
                    if (room.gameState === 'WAITING' || res.chipsToReturn === 0 || room.players.length === 1) {
                        dbUser.gold += res.chipsToReturn;
                    } else {
                        socket.emit('error_notification', 'Has perdido 10,000 Gold por abandonar Torneo/VIP.');
                    }
                }
                saveUsers(users);
                userState.fichas = dbUser.fichas;
                userState.gold = dbUser.gold;
            }

            userState.state = 'Lobby';
            userState.roomId = null;
            socket.leave(roomId);

            socket.emit('user_update', userState);

            if (room) {
                room.broadcastState();
            }
            broadcastToAdmins(io, connectedUsers, 'global_session_update', Object.values(connectedUsers));
        });

        // Chat Handlers
        socket.on( 'global_chat_message', ( msg ) =>
        {
            const user = connectedUsers[ socket.id ];
            if ( user && user.roomId )
            {
                socket.emit( 'error_notification', 'Solo puedes chatear en tu sala mientras estés sentado.' );
                return;
            }
            io.emit( 'global_chat_message', { sender: user ? user.username : 'Guest', msg, time: Date.now() } );
        } );

        socket.on('room_chat_message', (data) => {
            const user = connectedUsers[socket.id];
            io.to(data.roomId).emit('room_chat_message', { sender: user ? user.username : 'Guest', msg: data.msg });
        });

        socket.on('player_action', (data) => {
            const userState = connectedUsers[socket.id];
            if (!userState || !userState.roomId) return;

            const room = roomManager.rooms.get(userState.roomId);
            if (!room) return;

            // Validate it's their turn
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex === -1) return;

            const { action, amount } = data; // 'fold', 'check', 'call', 'raise', 'allin'
            room.handleAction(playerIndex, action, amount);
        });

        socket.on( 'toggle_sit_out', () =>
        {
            const userState = connectedUsers[ socket.id ];
            if ( !userState || !userState.roomId ) return;
            const room = roomManager.rooms.get( userState.roomId );
            if ( !room ) return;
            const p = room.players.find( p => p.socketId === socket.id );
            if ( p )
            {
                p.sittingOut = !p.sittingOut;
                room.broadcastState();
            }
        } );

        socket.on( 'toggle_ready', () =>
        {
            const userState = connectedUsers[ socket.id ];
            if ( !userState || !userState.roomId ) return;
            const room = roomManager.rooms.get( userState.roomId );
            if ( !room ) return;
            const pIdx = room.players.findIndex( p => p.socketId === socket.id );
            if ( pIdx !== -1 )
            {
                room.toggleReady( pIdx );
            }
        } );

        // Admin Actions
        socket.on('get_global_session', () => {
            const userSt = connectedUsers[socket.id];
            console.log('get_global_session called by:', socket.id, 'User:', userSt ? userSt.username : 'Unknown', 'IsAdmin:', userSt ? userSt.isAdmin : false);
            if (userSt && userSt.isAdmin) {
                const values = Object.values(connectedUsers);
                console.log('Returning session values length:', values.length);
                socket.emit('global_session_update', values);
            }
        });

        socket.on('admin_add_funds', (data) => {
            const admin = connectedUsers[socket.id];
            if (!admin || !admin.isAdmin) return;

            const { targetUserId, type, amount } = data; // type: 'fichas' or 'gold'
            let users = readUsers();
            let targetUser = users.find(u => u.id === targetUserId);

            if (targetUser) {
                if (type === 'fichas') targetUser.fichas += amount;
                if (type === 'gold') targetUser.gold += amount;
                saveUsers(users);

                // Find active socket of user
                let targetSocketId = Object.keys(connectedUsers).find(sid => connectedUsers[sid].id === targetUserId);
                if (targetSocketId) {
                    connectedUsers[targetSocketId].fichas = targetUser.fichas;
                    connectedUsers[targetSocketId].gold = targetUser.gold;
                    io.to(targetSocketId).emit('user_update', connectedUsers[targetSocketId]);
                    io.to(targetSocketId).emit('notification', `¡El Admin te ha regalado ${amount} ${type}!`);
                    // Play chips sound on their end
                    io.to(targetSocketId).emit('play_audio', 'chips');
                }

                broadcastToAdmins(io, connectedUsers, 'global_session_update', Object.values(connectedUsers));
            }
        });

        // Gamification Handlers
        socket.on('claim_daily_reward', () => {
            const userState = connectedUsers[socket.id];
            if (!userState) return;

            let users = readUsers();
            let dbUser = users.find(u => u.id === userState.id);
            if (!dbUser) return;

            const now = new Date();
            const lastClaim = dbUser.lastClaimDate ? new Date(dbUser.lastClaimDate) : null;

            const isDifferentDay = !lastClaim ||
                now.getDate() !== lastClaim.getDate() ||
                now.getMonth() !== lastClaim.getMonth() ||
                now.getFullYear() !== lastClaim.getFullYear();

            if (isDifferentDay) {
                // Check if streak is broken (more than 48h since last claim)
                const msInDay = 24 * 60 * 60 * 1000;
                if (lastClaim && (now - lastClaim) > msInDay * 2) {
                    dbUser.consecutiveDays = 1;
                } else {
                    dbUser.consecutiveDays = (dbUser.consecutiveDays || 0) + 1;
                    if (dbUser.consecutiveDays > 7) dbUser.consecutiveDays = 1;
                }

                dbUser.lastClaimDate = now.toISOString();

                // Reward logic
                const day = dbUser.consecutiveDays;
                let fichasReward = day * 500;
                let goldReward = 0;
                if (day === 7) {
                    fichasReward = 10000;
                    goldReward = 100;
                    dbUser.badges.push('Legendary Streak');
                }

                dbUser.fichas += fichasReward;
                dbUser.gold += goldReward;

                saveUsers(users);

                // Sync session and UI
                Object.assign(userState, {
                    fichas: dbUser.fichas,
                    gold: dbUser.gold,
                    consecutiveDays: dbUser.consecutiveDays,
                    lastClaimDate: dbUser.lastClaimDate,
                    badges: dbUser.badges
                });

                socket.emit('user_update', userState);
                socket.emit('daily_reward_claim_success', {
                    day,
                    fichas: fichasReward,
                    gold: goldReward,
                    msg: day === 7 ? '¡HAS DESBLOQUEADO EL COFRE LEGENDARIO!' : `Día ${day}: ¡Has reclamado tus recompensas!`
                });
                socket.emit('play_audio', 'victory');
            } else {
                socket.emit('error_notification', 'Ya has reclamado tu recompensa de hoy. ¡Vuelve mañana!');
            }
        });

        socket.on('buy_store_item', (data) => {
            const { itemId, priceType, priceAmount } = data;
            const userState = connectedUsers[socket.id];
            if (!userState) return;

            let users = readUsers();
            let dbUser = users.find(u => u.id === userState.id);
            if (!dbUser) return;

            if (priceType === 'fichas' && dbUser.fichas >= priceAmount) {
                dbUser.fichas -= priceAmount;
            } else if (priceType === 'gold' && dbUser.gold >= priceAmount) {
                dbUser.gold -= priceAmount;
            } else {
                return socket.emit('error_notification', 'No tienes suficientes fondos.');
            }

            dbUser.inventory.push(itemId);
            saveUsers(users);

            Object.assign(userState, {
                fichas: dbUser.fichas,
                gold: dbUser.gold,
                inventory: dbUser.inventory
            });

            socket.emit('user_update', userState);
            socket.emit('notification', `¡Has comprado: ${itemId}!`);
            socket.emit('play_audio', 'chips');
        });

        socket.on('get_filtered_ranking', (filter) => {
            let users = readUsers();
            
            // Map users and account for chips currently on tables
            let list = users.map(u => {
                // Find if user is currently connected and has chips in a room
                // We trust connectedUsers as it syncs when joining/leaving
                let activeSession = Object.values(connectedUsers).find(s => s.email === u.email);
                let currentFichas = u.fichas;
                let currentGold = u.gold;

                if (activeSession && activeSession.roomId) {
                    // Logic: Normally fichas/gold are deducted when joining room.
                    // We don't have an easy way to see "chips on table" here without querying roomManager,
                    // but we can assume if they are in a room, their ranking should reflect their "potential" or total wealth.
                    // For now, let's just make sure it's at least as up to date as users.json
                }

                return {
                    id: u.id,
                    username: u.username,
                    fichas: currentFichas,
                    gold: currentGold,
                    level: u.level || 1,
                    tournamentsWon: u.tournamentsWon || 0,
                    vipRoomsWon: u.vipRoomsWon || 0
                };
            });

            // Sorting logic based on filter
            if (filter === 'daily') {
                // Focus on wins
                list = list.sort((a, b) => (b.tournamentsWon + b.vipRoomsWon) - (a.tournamentsWon + a.vipRoomsWon)).slice(0, 10);
            } else if (filter === 'weekly') {
                // Focus on wealth (Gold + Fichas)
                list = list.sort((a, b) => (b.fichas + b.gold * 100) - (a.fichas + a.gold * 100)).slice(0, 10);
            } else {
                // Historical by level
                list = list.sort((a, b) => b.level - a.level).slice(0, 10);
            }

            socket.emit('filtered_ranking_update', list);
        });
    });
}

function broadcastToAdmins(io, connectedUsers, event, data) {
    for (let sid in connectedUsers) {
        if (connectedUsers[sid].isAdmin) {
            io.to(sid).emit(event, data);
        }
    }
}
