// --- State Management ---
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let activeChat = null;
let isLoginMode = true;
let mediaRecorder = null;
let audioChunks = [];

// --- DOM Elements ---
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const chatList = document.getElementById('chat-list');
const messageArea = document.getElementById('message-area');
const voiceBtn = document.getElementById('voice-rec-btn');

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
        login(newUser); // Auto-login
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
    
    allUsers.filter(u => u.id !== currentUser.id && u.id.toLowerCase().includes(query.toLowerCase())).forEach(user => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.style.padding = '15px';
        div.style.borderBottom = '1px solid #f0f2f5';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.innerHTML = `<div class="avatar">${user.name[0]}</div>
                         <div><strong>${user.name}</strong><br><small style="color:#667781">${user.id}</small></div>`;
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
    if (!activeChat) return;
    messageArea.innerHTML = '';
    const key = [currentUser.id, activeChat.id].sort().join('_');
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    msgs.forEach((m, index) => renderMessage(m, index));
    messageArea.scrollTop = messageArea.scrollHeight;
}

function renderMessage(m, index) {
    const div = document.createElement('div');
    div.className = `msg ${m.sender === currentUser.id ? 'sent' : 'received'}`;
    
    let content = '';
    if (m.type === 'file') {
        if (m.fileType.startsWith('image')) {
            content = `<img src="${m.content}" style="max-width:100%; border-radius:8px; display:block;">`;
        } else if (m.fileType.startsWith('video')) {
            content = `<video src="${m.content}" controls style="max-width:100%; border-radius:8px; display:block;"></video>`;
        } else if (m.fileType.startsWith('audio')) {
            content = `<audio src="${m.content}" controls style="width:200px; display:block;"></audio>`;
        } else {
            content = `<a href="${m.content}" download="${m.fileName}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:5px;">
                                📄 <span style="font-size:12px;">${m.fileName}</span>
                             </a>`;
        }
    } else {
        content = m.content;
    }
    
    div.innerHTML = `
        <div class="msg-content">${content}</div>
        <div class="msg-meta">
            <span class="msg-time">${m.time}</span>
            <button class="delete-msg-btn" onclick="deleteSingleMessage(${index})">×</button>
        </div>
    `;
    
    messageArea.appendChild(div);
}

function deleteSingleMessage(index) {
    if (!confirm("Delete this message?")) return;
    const key = [currentUser.id, activeChat.id].sort().join('_');
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    msgs.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(msgs));
    loadMessages();
}

document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('msg-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
};

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
    if (!file) return;

    // 5MB Limit Check
    if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit!");
        return;
    }

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

// --- Voice Recording ---
voiceBtn.onclick = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // 5MB Check for Voice
                if (audioBlob.size > 5 * 1024 * 1024) {
                    alert("Voice message too long (exceeds 5MB)!");
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    saveAndRender({
                        content: reader.result,
                        type: 'file',
                        fileName: 'voice_message.webm',
                        fileType: 'audio/webm',
                        sender: currentUser.id,
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    });
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            voiceBtn.classList.add('recording');
        } catch (err) {
            alert("Error accessing microphone: " + err.message);
        }
    } else {
        mediaRecorder.stop();
        voiceBtn.classList.remove('recording');
    }
};

// --- Delete Chat ---
document.getElementById('delete-chat-btn').onclick = () => {
    if (!activeChat) return;
    if (confirm(`Are you sure you want to clear chat with ${activeChat.name}?`)) {
        const key = [currentUser.id, activeChat.id].sort().join('_');
        localStorage.removeItem(key);
        loadMessages();
    }
};

function saveAndRender(msg) {
    if (!activeChat) return;
    const key = [currentUser.id, activeChat.id].sort().join('_');
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    msgs.push(msg);
    localStorage.setItem(key, JSON.stringify(msgs));
    renderMessage(msg);
}

// Search Logic
document.getElementById('user-search').oninput = (e) => renderChatList(e.target.value);

// Sync across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'chat_users') renderChatList();
    if (currentUser && activeChat) {
        const key = [currentUser.id, activeChat.id].sort().join('_');
        if (e.key === key) loadMessages();
    }
    if (e.key === 'currentUser' && !localStorage.getItem('currentUser')) {
        location.reload();
    }
});

// Mobile Back
document.getElementById('back-btn').onclick = () => document.getElementById('chat-window').classList.remove('active');

// Init
if (currentUser) login(currentUser);