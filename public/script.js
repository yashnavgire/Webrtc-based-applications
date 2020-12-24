const socket = io('/')
const videoGrid = document.getElementById('video-grid')
var myId=null;
var dataconn=null;

const myPeer = new Peer({
  config: {'iceServers': [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'turn:relay.backups.cz',
      credential: 'webrtc',
      username: 'webrtc'}
  ]} /* Sample servers, please use appropriate ones */
})


const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
  // cursor:true
}).then(stream => {
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    console.log("call recieved")
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      console.log("stream recieved")
      addVideoStream(video, userVideoStream)
    })
  })

  // socket.emit('join-room', ROOM_ID, myId)

  socket.on('user-connected', userId => {
    dataconn=connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
  myId=id;
})


myPeer.on('connection', function(conn) {
  conn.on('open', function() {
    // Receive messages
    conn.on('data', function(data) {
      console.log('Received', data);
      SendDataToClientServer("http://127.0.0.1:8001/",data);
    });
    
    // Send messages
    // conn.send('Hello from reciever!');
    dataconn=conn;
  });
});


function connectToNewUser(userId, stream) {
  console.log("calling..")
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call

  ////for data channel
  var conn = myPeer.connect(userId);
  conn.on('open', function() {
    // Receive messages
    conn.on('data', function(data) {
      console.log('Received', data);
      SendDataToClientServer("http://127.0.0.1:8001/",data);
    });
  
    // Send messages
    // conn.send('Hello from initiator!!');
    
  });

  return conn;
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    // video.muted=true
    video.play()
     
  })
  videoGrid.append(video)
}

function SendDataToClientServer(path,data){
  let xhr = new XMLHttpRequest();

  let json = JSON.stringify(data);
  
  xhr.open("POST", path);
  xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  
  xhr.send(json);
  console.log("sent ");
}


function send(){
  var data= {};
  var text=document.getElementById('key').value;
  data.name=text;
  data.id=myId;
  dataconn.send(data);
}

