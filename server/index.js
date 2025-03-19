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
    setUsers: function (newUsersArray){
        this.users = newUsersArray
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

    socket.on('enterRoom', ({ name, room }) => {
        //leave previous chat room
        const prevRoom = getUser(socket.id)?.room
        if (prevRoom){
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room)

        if (prevRoom) {
            io.to(prevRoom).emit('AIsuggest', {
                users: getUsersInRoom(prevRoom)
            })
        }

        // join room
        socket.join(user.room)

        //To user who joins room
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`))

        //To everyone else (new user joining)
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`))

        //Update user list for room (where the suggestion will go.....)
        io.to(user.room).emit('AIsuggest', {
            users: getUserinRoom(user.room)
        })

        // Update similarity
        io.emit('similar', {
            rooms: getAllActiveRooms()
        })
    })

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

    // Listen for activity (keypress)
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
function activateUser(id, name, room){
    // User is their id , name, and room
    const user = { id, name, room } 
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