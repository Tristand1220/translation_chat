const socket = io('ws://localhost:3500')

//Watching typing activity
const msgInput = document.querySelector('#message')

//Watching chatname and target language
const nameInput = document.querySelector('#name')
const langRoom = document.querySelector('#langauge')

// AI suggestions and similarity
const aiSuggestion = document.querySelector('.AIsuggest')
const similarity = document.querySelector('.similar')
const activity = document.querySelector('.activity')

//Chat Display
const chatDisplay = document.querySelector('.chat-display')

function sendMessage(e){
    e.preventDefault()
    if (nameInput.value && msgInput.value && langRoom.value) {
        socket.emit('message', {name: nameInput.value,
            text:msgInput.value})
        msgInput.value = ""
    }
    msgInput.focus()
}

//Entering correct chatroom
function enterRoom(e){
    e.preventDefault()
    if (nameInput.value && langRoom.value){
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: langRoom.value
        })
    }
}

// Submits form by applying the message function when submit happens
document.querySelector('form-msg').addEventListener('submit', sendMessage)
document.querySelector('form-join').addEventListener('submit', enterRoom)

// Sending user name who's typing (activity)
msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
})

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const li =  document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)
})



// Timer for typing message
let activityTimer
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`

    // Clear after 1 second
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 1000)
})