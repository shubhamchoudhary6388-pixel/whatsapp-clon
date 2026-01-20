// --- State Management ---
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let activeChat = null;
let isLoginMode = true;

// --- DOM Elements ---
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const chatList = document.getElementById('chat-list');
const messageArea = document.getElementById('message-area');

// --- Auth Functions ---
document.getElementById('toggle-auth').onclick = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Login" : "Register";
    document.getElementById('reg-name').classList.toggle('hidden', isLoginMode);
    document.getElementById('auth-btn').innerText = isLoginMode ? "Login" : "Register";
};

document.getElementById('auth-btn').onclick = () => {
    const id = document.getElementById('auth-userid').value.trim();
    const pass = document.getElementById('auth-password').value;
    const name = document.getElementById('reg-name').value;
    let users = JSON.parse(localStorage.getItem('chat_users')) || [];

    if (isLoginMode) {
        const user = users.find(u => u.id === id && u.pass === pass);
        if (user) login(user);
        else alert("Invalid credentials");
    } else {
        if (users.find(u => u.id === id)) return alert("ID Taken");
        const newUser = { id, pass, name };
        users.push(newUser);
        localStorage.setItem('chat_users', JSON.stringify(users));
        alert("Registered! Now Login.");
        document.getElementById('toggle-auth').click();
    }
};

function login(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('my-name').innerText = user.name;
    document.getElementById('my-avatar').innerText = user.name[0];
    renderChatList();
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

// --- Chat Functions ---
function renderChatList(query = '') {
    const allUsers = JSON.parse(localStorage.getItem('chat_users')) || [];
    chatList.innerHTML = '';
    
    allUsers.filter(u => u.id !== currentUser.id && u.id.includes(query)).forEach(user => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.style.padding = '15px';
        div.style.borderBottom = '1px solid #eee';
        div.style.cursor = 'pointer';
        div.innerHTML = `<strong>${user.name}</strong><br><small>${user.id}</small>`;
        div.onclick = () => openChat(user);
        chatList.appendChild(div);
    });
}

function openChat(user) {
    activeChat = user;
    document.getElementById('no-chat-selected').classList.add('hidden');
    document.getElementById('active-chat-ui').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = user.name;
    document.getElementById('chat-avatar').innerText = user.name[0];
    document.getElementById('chat-window').classList.add('active');
    loadMessages();
}

function loadMessages() {
    messageArea.innerHTML = '';
    const key = [currentUser.id, activeChat.id].sort().join('_');
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    msgs.forEach(m => renderMessage(m));
}

function renderMessage(m) {
    const div = document.createElement('div');
    div.className = `msg ${m.sender === currentUser.id ? 'sent' : 'received'}`;
    
    if (m.type === 'file') {
        if (m.fileType.startsWith('image')) {
            div.innerHTML = `<img src="${m.content}" style="max-width:200px; border-radius:5px;">`;
        } else {
            div.innerHTML = `<a href="${m.content}" download="${m.fileName}">📄 ${m.fileName}</a>`;
        }
    } else {
        div.innerText = m.content;
    }
    
    div.innerHTML += `<span class="msg-time">${m.time}</span>`;
    messageArea.appendChild(div);
    messageArea.scrollTop = messageArea.scrollHeight;
}

document.getElementById('send-btn').onclick = sendMessage;
function sendMessage() {
    const input = document.getElementById('msg-input');
    if (!input.value.trim()) return;
    saveAndRender({ 
        content: input.value, 
        type: 'text', 
        sender: currentUser.id,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });
    input.value = '';
}

// --- File Handling ---
document.getElementById('file-input').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        saveAndRender({
            content: reader.result,
            type: 'file',
            fileName: file.name,
            fileType: file.type,
            sender: currentUser.id,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });
    };
    reader.readAsDataURL(file);
};

function saveAndRender(msg) {
    const key = [currentUser.id, activeChat.id].sort().join('_');
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    msgs.push(msg);
    localStorage.setItem(key, JSON.stringify(msgs));
    renderMessage(msg);
}

// Search Logic
document.getElementById('user-search').oninput = (e) => renderChatList(e.target.value);

// Mobile Back
document.getElementById('back-btn').onclick = () => document.getElementById('chat-window').classList.remove('active');

// Check Login State
if (currentUser) login(currentUser);