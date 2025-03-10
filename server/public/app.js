const socket = io('ws://localhost:3500')

//Watching typing activity

const activity = document.querySelector('.activity')
const msgInput = document.querySelector('input')

function sendMessage(e){
    e.preventDefault()
    if (msgInput.value) {
        socket.emit('message', msgInput.value)
        msgInput.value = ""
    }
    msgInput.focus()
}

// Submits form by applying the message function when submit happens
document.querySelector('form').addEventListener('submit', sendMessage)

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const li =  document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)
})

// Sending activity event to server along with id
msgInput.addEventListener('keypress', () => {
    socket.emit('activity', socket.id.substring(0, 5))
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