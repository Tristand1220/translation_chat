const socket = io('ws://localhost:3500') // Use https://practilang.onrender.com to launch outside local

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

// Sending a message
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

// Submits form by applying the message function when submit button is clicked
document.querySelector('.form-msg button').addEventListener('click',sendMessage);

// Joining a room
document.querySelector('.form-join').addEventListener('submit', enterRoom)

// Translation when enter is pressed
msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
        e.preventDefault();
        aiSuggest();
    }else{
        // Sending user name who's typing (activity)
        socket.emit('activity',nameInput)
    }
});
        


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


// Translating message
async function aiSuggest(){
    if(msgInput.value){
        showLoading();
        try{
            // Call API and show suggestion
            const suggestion = await fetchTranslation(msgInput.value);
            displaySuggestion(suggestion); 
        } catch (error){
            // Display error if no suggestion
            displayError();
        }
    }
}

//Loading translation feedback
function showLoading(){
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-translation';
    loadingText.textContent = 'Translating...';
    aiSuggestion.appendChild(loadingText);
}

// Display suggestion
function displaySuggestion(translatedText){
    //Remove loading
    const load = aiSuggestion.querySelector('.loading-translation')
    if (load){
        aiSuggestion.removeChild(load);
    }
    
    if (translatedText){
        aiSuggestion.innerHTML = `<em>A more practical way you could say this:</em>`;

        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'translation';
        suggestionDiv.textContent = translatedText;
        aiSuggestion.appendChild(suggestionDiv);
    }else{
        displayError();
    }
}

//Display Translation Error
function displayError(){
    //Remove loading
    const load = aiSuggestion.querySelector('.loading-translation')
    if (load){
        aiSuggestion.removeChild(load);
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = 'Translation failed. PLease try again.';
    aiSuggestion.appendChild(errorDiv);
}

function showSimilar(text){
    similarity.textContent = ''
    if (text) {
        similarity.innerHTML = '<em>Which is similar to:</em>'
        // API similarity should go here ?
    }
}


async function fetchTranslation(text) {
    const url = 'https://openl-translate.p.rapidapi.com/translate';
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-key': 'secret', //Tristan has the API Key
            'x-rapidapi-host': 'openl-translate.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target_lang: 'zh-CN',
            text: text
        })
    };
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result.translatedText;
    } catch (error) {
        console.error("Translation error: ",error);
        return null;
    }
} 