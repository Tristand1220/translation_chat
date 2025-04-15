/* To run the app, go to bash terminal and type node server/index.js and then follow the link http://localhost:3500 
Terminal Debugging statements courtesy of Claude Sonnet 3.5*/

import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500
const ADMIN = "Admin"

const app = express()


dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Checking if API key loaded correctly
const api_key = process.env.DEEPSEEK_API_KEY
console.log('API_KEY loaded:', api_key ? 'Yes' : 'No');

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "public")))


// DEEPSEEK API POST resquest
app.post('/api/suggestion', async (req, res) => {
    try {
      console.log('Translation request received:', req.body);
      
      // Check if API key is available
      if (!process.env.DEEPSEEK_API_KEY) {
        console.error('API_KEY is missing! Check your .env file and server configuration.');
        return res.status(500).json({ 
          error: 'Server configuration error',
          details: 'API key is not available' 
        });
      }
      // Passing message to API body
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ 
          error: 'Missing required parameters: text and targetLanguage are required' 
        });
      }
      
      console.log(`Attempting to give suggestion for ${targetLanguage}`);
      
      const translatedText = await fetchTranslation(text, targetLanguage);
      console.log('Suggestion successfully given, check quality');
      
      res.json({ translation: translatedText });
    } catch (error) {
      // Detailed error logging
      console.error('Translation API error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      res.status(500).json({ 
        error: 'Failed to perform translation',
        details: error.message 
      });
    }
  });
  
  // Similarly for similarity endpoint
  app.post('/api/similarity', async (req, res) => {
    try {
      console.log('Similarity request received:', req.body);
      
      // Check if API key is available
      if (!process.env.DEEPSEEK_API_KEY) {
        console.error('API_KEY is missing! Check your .env file and server configuration.');
        return res.status(500).json({ 
          error: 'Server configuration error',
          details: 'API key is not available' 
        });
      }
      
      const { text, nativeLanguage, targetLanguage } = req.body;
      
      if (!text || !nativeLanguage || !targetLanguage) {
        return res.status(400).json({ 
          error: 'Missing required parameters: text, nativeLanguage, and targetLanguage are required' 
        });
      }
      
      console.log(`Attempting to analyze similarity between ${targetLanguage} phrase and tranlsating it to ${nativeLanguage}`);
      
      const similarityAnalysis = await fetchSimilarity(text, nativeLanguage, targetLanguage);
      console.log('Similarity analysis successful');
      
      res.json({ similarity: similarityAnalysis });
    } catch (error) {
      // Detailed error logging
      console.error('Similarity API error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      res.status(500).json({ 
        error: 'Failed to perform similarity analysis',
        details: error.message 
      });
    }
  });
  

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

// API Prompts
const suggestionPrompt = "You are a helpful assistant that recieves a message and returns a more practial and culturally appropriate way of saying the given message in the same langauge it was presented to you. Only return the suggestion you deem to be the most practical without explanation or additional context"
const similarityPrompt ="Given a message in {output_language}, provide a contextually and culturally similar alternative phrasing of this message translated in {input_language}. Only return the translation you deem to be the most similar without explanation"

/**
 * Fetches translation from Deepseek API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language for translation
 * @returns {Promise<string>} - Translated text
 */
async function fetchTranslation(text, targetLanguage) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: suggestionPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: .7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Translation error: ", error);
    throw error;
  }
}

/**
 * Fetches similarity analysis from Deepseek API
 * @param {string} translatedText - Text to analyze
 * @param {string} nativeLanguage - Source language
 * @param {string} targetLanguage - Target language
 * @returns {Promise<string>} - Similarity analysis
 */
async function fetchSimilarity(translatedText, nativeLanguage, targetLanguage) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: similarityPrompt
              .replace("{input_language}", nativeLanguage)
              .replace("{output_language}", targetLanguage)
          },
          {
            role: "user",
            content: translatedText
          }
        ],
        temperature: .7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Similarity error: ", error);
    throw error;
  }
}
