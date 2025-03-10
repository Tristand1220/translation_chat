import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    //Upon connection, sends only to user
    socket.emit('message', "Welcome to practiLang !")

    //Upon connection, sends to all other
    socket.broadcast.emit('message', `User ${socket.id.substring(0,5)}} connected`)

    // Listening for message event
    socket.on('message', data => {
        console.log(data)
        // Sending message and who it came from  to all connected to server
        io.emit('message', `${socket.id.substring(0,5)}: ${data}`)
    })

    // When user disconnects, sends to all others
    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `User ${socket.id.substring(0,5)}} disconnected`)
    })

    // Listen for activity (keypress)
    socket.on('activity', (name) => {
        // Sends "{user} is typing..." to everyone else
        socket.broadcast.emit('activity', name)
    })
})

