const io = require('socket.io-client');

console.log('Testing WebSocket connection to jeetSocial...');

const socket = io('http://localhost:5678', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket!');
  console.log('Socket ID:', socket.id);
  
  // Join feed room
  socket.emit('join_feed');
  
  // Test ping
  socket.emit('ping');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('welcome', (data) => {
  console.log('👋 Welcome:', data);
});

socket.on('room_joined', (data) => {
  console.log('📝 Room joined:', data);
});

socket.on('pong', (data) => {
  console.log('🏓 Pong:', data);
});

socket.on('new_post', (data) => {
  console.log('📨 New post:', data);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout, disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);