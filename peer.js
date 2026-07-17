const peers = new Map();

const cfg = {
  iceServers:[
    {urls:"stun:stun.l.google.com:19302"},
    {urls:"stun:stun1.l.google.com:19302"}
  ]
};

const makeId = () =>
  "p_" + Math.random().toString(36).slice(2,8);


function createPeer(id){
  const pc = new RTCPeerConnection(cfg);

  const peer = {
    pc,
    dc:null
  };

  peers.set(id,peer);

  pc.onicecandidate = () => {
    if(pc.localDescription)
      peer.code = JSON.stringify({
        id,
        sdp:pc.localDescription
      });
  };

  return peer;
}


function openChannel(id,dc){
  const p = peers.get(id);
  p.dc = dc;

  dc.onopen = () =>
    peerOpen(id);

  dc.onmessage = e =>
    peerMessage(id,e.data);

  dc.onclose = () =>{
    peers.delete(id);
    peerClose(id);
  };
}


async function makeOffer(){

  const id = makeId();
  const p = createPeer(id);

  openChannel(
    id,
    p.pc.createDataChannel("chat")
  );

  await p.pc.setLocalDescription(
    await p.pc.createOffer()
  );

  return p.code;
}


async function makeAnswer(code){

  const {id,sdp}=JSON.parse(code);

  let p = peers.get(id);

  if(!p){

    p=createPeer(id);

    p.pc.ondatachannel=e=>
      openChannel(id,e.channel);
  }


  if(sdp.type=="offer"){

    await p.pc.setRemoteDescription(sdp);

    await p.pc.setLocalDescription(
      await p.pc.createAnswer()
    );

    return p.code;

  }else{

    await p.pc.setRemoteDescription(sdp);

  }
}


function sendPeer(id,text){

  const p=peers.get(id);

  if(
    p?.dc?.readyState=="open"
  )
    p.dc.send(text);
}