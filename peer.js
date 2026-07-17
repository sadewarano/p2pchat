const peers=new Map();

const cfg={
 iceServers:[
  {urls:"stun:stun.l.google.com:19302"},
  {urls:"stun:stun1.l.google.com:19302"}
 ]
};


const makeId=()=>
"p_"+Math.random().toString(36).slice(2,8);


function createPeer(id){

 const pc=new RTCPeerConnection(cfg);

 const peer={
  pc,
  dc:null,
  code:null
 };

 peers.set(id,peer);


 pc.onicecandidate=e=>{

  if(!e.candidate && pc.localDescription){

   peer.code=JSON.stringify({
    id,
    sdp:pc.localDescription
   });

  }

 };


 return peer;
}


function openChannel(id,dc){

 const p=peers.get(id);

 p.dc=dc;


 dc.onopen=()=>{
  if(window.peerOpen)
   peerOpen(id);
 };


 dc.onmessage=e=>{
  if(window.peerMessage)
   peerMessage(id,e.data);
 };


 dc.onclose=()=>{

  peers.delete(id);

  if(window.peerClose)
   peerClose(id);

 };

}


function waitCode(p){

 return new Promise(r=>{

  let t=setInterval(()=>{

   if(p.code){

    clearInterval(t);
    r(p.code);

   }

  },50);

 });

}



async function makeOffer(){

 const id=makeId();

 const p=createPeer(id);


 openChannel(
  id,
  p.pc.createDataChannel("chat")
 );


 await p.pc.setLocalDescription(
  await p.pc.createOffer()
 );


 return await waitCode(p);

}



async function makeAnswer(code){

 const {id,sdp}=JSON.parse(code);

 let p=peers.get(id);


 if(!p){

  p=createPeer(id);

  p.pc.ondatachannel=e=>{
   openChannel(id,e.channel);
  };

 }


 await p.pc.setRemoteDescription(sdp);


 if(sdp.type=="offer"){

  await p.pc.setLocalDescription(
   await p.pc.createAnswer()
  );

  return await waitCode(p);

 }

}



function sendPeer(id,text){

 const p=peers.get(id);

 if(
  p?.dc?.readyState=="open"
 )
 p.dc.send(text);

}