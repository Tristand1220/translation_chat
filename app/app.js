const socket = io('ws://localhost:3500')

function sendMessage(e){
    e.preventDefault()
    const input = document.querySelector('input')
    if (input.value) {
        socket.emit('message', input.value)
        input.value = ""
    }
    input.focus()
}

// Submits form by applying the message function when submit happens
document.querySelector('form').addEventListener('submit', sendMessage)

// Listen for messages
socket.on("message",(data) => {
    const li =  document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)
})