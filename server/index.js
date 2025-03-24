import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500
const ADMIN = "Admin"

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

// state
const UserState = {
    users: [],
    waitingUsers: [],
    setUsers: function(newUsersArray){
        this.users = newUsersArray
    },
    addWaitingUsers: function(user) {
        this.waitingUsers.push(user)
    },
    removeWaitingUsers: function(userId) {
        this.waitingUsers=this.waitingUsers.filter(user => user.id !== userId)
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    //Upon connection, sends only to user
    socket.emit('message', buildMsg(ADMIN, "Welcome to practiLang !"))

    socket.on('enterRoom', ({ name, nativeLanguage, targetLanguage }) => {
        //leave previous chat room
        const prevRoom = getUser(socket.id)?.room;
        if (prevRoom){
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }

        // Creat new user
        const newUser = {
            id: socket.id,
            name,
            nativeLanguage,
            targetLanguage,
            room: null //Dynamically assigned
        };

        const roomName = createRoomName(nativeLanguage, targetLanguage);
        const existingRoom = getAllActiveRooms().includes(roomName);
        if (existingRoom){

            // Updating room attribute and adding user to room
            newUser.room = roomName;
            activateUser(socket.id, name, roomName, nativeLanguage, targetLanguage);

            // join room
            socket.join(roomName)

            //To user who joins room
            socket.emit('message', buildMsg(ADMIN, `You have joined the ${roomName} exchange room`));

            //To everyone else (new user joining)
            socket.broadcast.to(roomName).emit('message', buildMsg(ADMIN, `${name} has joined the room`));
            
        } else {
            // Finding match for chatrooom creation
            const match = findMatch(newUser);

            if (match){
                newUser.room=roomName;
                activateUser(socket.id, name, roomName, nativeLanguage, targetLanguage);
                
                // Remove user from waiting queue
                UserState.removeWaitingUsers(match.id);
                
                //Doing the same for match
                const matchSocket = io.sockets.sockets.get(match.id);

                if (matchSocket) {
                    matchSocket.join(roomName);
                    activateUser(match.id, match.name, roomName, match.nativeLanguage, match.targetLanguage);

                    // Feedback on match found
                    matchSocket.emit('message', buildMsg(ADMIN, `You've been matched! Joined ${roomName} exchange room`));
                    
                }
                // join room
                socket.join(roomName);

                //To user who joins room
                socket.emit('message', buildMsg(ADMIN, `You have joined the ${roomName} chat room`));

                //To everyone else (new user joining)
                socket.broadcast.to(roomName).emit('message', buildMsg(ADMIN, `${newUser.name} has joined the room`));
        } else {
            // No match - add to waiting list
            UserState.addWaitingUsers(newUser);

            //Notify once match found
            socket.emit('waitingForMatch',{
                nativeLanguage,
                targetLanguage
            });
        }
    }
});
    

     // When user disconnects, sends to all others
     socket.on('disconnect', () => {
        const user = getUser(socket.id)
        leaveApp(socket.id)
        
        if(user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))
        }
        console.log(`User ${socket.id} disconnected`)
    })

    // Listening for message event
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room

        // Sending message and who it came from to all connected to server
        if (room) {
            io.to(room).emit('message', buildMsg(name, text))
        }
    })

    // Listen for activity (keydown)
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        // Sends "{user} is typing..." to everyone else
        if (room) {
            socket.broadcast.to(room).emit('activity', name)
        }
    })
})

// Creates our text; with name, message, and time sent
function buildMsg(name,text){
    return{
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric'
        }).format(new Date())
    }
}

// User functions

// Adds user to a room and makes sure they're not a duplicate
function activateUser(id, name, room, nativeLanguage,targetLanguage){
    // User is their id , name, and room
    const user = { id, name, room, nativeLanguage, targetLanguage } 
    UserState.setUsers([
        ...UserState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

//User leaving application
function leaveApp(id){
    UserState.setUsers(
        UserState.users.filter(user => user.id !== id)
    )
}

// Get user
function getUser(id){
    return UserState.users.find(user => user.id === id)
}

// Get user room
function getUserinRoom(room){
    return UserState.users.filter(user => user.room === room)
}

//Get all active chatrooms (set to avoid duplicates)
function getAllActiveRooms(){
    return Array.from(new Set(UserState.users.map(user => user.room)))
}

//Create room name based on matching
function createRoomName(lang1,lang2){
    // Alpahabetically sort lang names for coonsitency
    const sortedlangs =[lang1,lang2].sort();
    return `${sortedlangs[0]}-${sortedlangs[1]}`;
}

// Chatroom matching based on compliment langs
function findMatch(user){
    return UserState.waitingUsers.find(waitingUsers =>
        waitingUsers.nativeLanguage === user.targetLanguage &&
        waitingUsers.targetLanguage === user.nativeLanguage
    );
}

function findExistingRoom(nativeLanguage,targetLanguage) {
    const roomName = createRoomName(nativeLanguage,targetLanguage);
    return getAllActiveRooms().includes(roomName) ? roomName : null;
}