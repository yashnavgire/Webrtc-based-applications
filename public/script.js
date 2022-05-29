const socket = io('/')
const videoGrid = document.getElementById('video-grid')

//update room link
document.getElementById('room_link').href = window.location.href

//global variables
var myId=null;
var dataconn=null;
var send_emit_event_on_open=false

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
const peerVideoElements = {}
//console.log(myPeer)

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
  // cursor:true
}).then(stream => {
    addVideoStream(myVideo, stream)

    //when new user joins room,all the users already present in that room calls this new user(this event will hit on the applicaiton of new user joined)
    myPeer.on('call', call => {
        console.log("call recieved")
        //console.log(call)
        peers[call.peer] = call
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            console.log("stream recieved")
            addVideoStream(video, userVideoStream)          
        })
        call.on('close', () => {
            //console.log("disonnect")
            video.remove()
        })
    })

/*-----------add this event for remote desktop here------------------------*/
    if(myId !== null) {
        socket.emit('join-room', ROOM_ID, myId)
    }
    else{
        send_emit_event_on_open=true
    }
/*---------------------------------------------------------------------------*/  

    //when new user joins in this room,this event fires on each client present in this room.
    socket.on('user-connected', userId => {
        dataconn=connectToNewUser(userId, stream)
    })
})

//when other user disconnects,close the connection with that user
socket.on('user-disconnected', userId => {
    console.log("disconnect recieved")
    if (peers[userId])
    {
        peers[userId].close()
    }
})


//when mypeer object opened on the peer.js server this event is fired 
myPeer.on('open', id => {
  if(send_emit_event_on_open)
    socket.emit('join-room', ROOM_ID, id)
  
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
  //console.log(call)

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
  video.controls = true
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
