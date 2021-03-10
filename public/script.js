const socket = io('/')
const videoGrid = document.getElementById('video-grid')
var myId=null;
var dataconn=null;

const myPeer = new Peer({
  config: {'iceServers': [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'turn:homeo@turn.bistri.com:80',
      credential: 'homeo',
      }
  ]} /* Sample servers, please use appropriate ones */
})


const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}


navigator.mediaDevices.getDisplayMedia({
  // video: true,
  // audio: true
  cursor:true
}).then(stream => {
  addVideoStream(myVideo, stream)


//when user joins new room,all the users already present in that room calls this new user
  myPeer.on('call', call => {
    console.log("call recieved")
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      console.log("stream recieved")
      addVideoStream(video, userVideoStream)
    })
  })

/*-----------add this event for remote desktop here------------------------*/
  
socket.emit('join-room', ROOM_ID, myId)

/*---------------------------------------------------------------------------*/  

//when new user joins in this room,this event fires on each client present in this room
  socket.on('user-connected', userId => {
    dataconn=connectToNewUser(userId, stream)
  })
})

//when other user disconnects,close the connection with that user
socket.on('user-disconnected', userId => {
  if (peers[userId]) 
    peers[userId].close()
})


//when mypeer object opened on the peer.js server this event is fired 
myPeer.on('open', id => {
  // socket.emit('join-room', ROOM_ID, id)
  myId=id;
})


//This is to recieve data channel connection
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

  delete xhr;
}


function send(){
  var data= {};
  var text=document.getElementById('key').value;
  data.name=text;
  data.id=myId;
  dataconn.send(data);    //for multiple desktop connection array of dataconn need to be maintained(current implementation will overwrite the dataconn object)
}

function sendKey(event){
  var data={};
  data.name=event.key;
  data.id=myId;
  dataconn.send(data);
}