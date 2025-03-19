const socket = io('https://practilang.onrender.com')

//Watching typing activity
const msgInput = document.querySelector('#message')

//Watching chatname and target language
const nameInput = document.querySelector('#name')
const langRoom = document.querySelector('#language')

// AI suggestions and similarity
const aiSuggestion = document.querySelector('.AIsuggest')
const similarity = document.querySelector('.similar')
const activity = document.querySelector('.activity')

//Chat Display
const chatDisplay = document.querySelector('.chat-display')

function sendMessage(e) {
    e.preventDefault()
    if (nameInput.value && msgInput.value && langRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        })
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
document.querySelector('.form-msg').addEventListener('submit', sendMessage)
document.querySelector('.form-join').addEventListener('submit', enterRoom)

// Sending user name who's typing (activity)
msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
})

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const li =  document.createElement('li')
    li.className = 'post'
    if (name === nameInput.value)li.className = 'post post--right'
    if (name !== nameInput.value && name !== 'Admin')li.className = 'post post--left'
    //Creating the message in chat from users, with name time as a header
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'}">
        <span class="post__header--name">${name}</span><span class="post__header--time">${time}</span></div><div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`
    }
    document.querySelector('.chat-display').appendChild(li)
    // Scrolling through messages
    chatDisplay.scrollTop = chatDisplay.scrollHeight
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

//Activities for translation
socket.on('aiSuggestion', ({ text }) => {
    showSuggestion(text)
})
socket.on('similarity', ({ text }) => {
    showSimilar(text)
})


//Where updating the suggestion and similarity happens...
function showSuggestion(text){
    aiSuggestion.textContent = ''
    if (text) {
        aiSuggestion.innerHTML = '<em>A more practical way you could say this:</em>'
        // API translation should go here ?
    }
}
function showSimilar(text){
    similarity.textContent = ''
    if (text) {
        similarity.innerHTML = '<em>Which is similar to:</em>'
        // API similarity should go here ?
    }
}