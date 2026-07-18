const $=id=>document.getElementById(id);

const status=$("status"),
localSDP=$("localSDP"),
remoteSDP=$("remoteSDP"),
chat=$("chatBox"),
msg=$("msgInput"),
send=$("btnSend");

const peerName=$("peerName");
const GAS="https://script.google.com/macros/s/AKfycbzIHG5X4pf8CkHVJq3hWas0p6NdYQPd_Hf9uJXhmgd2FkMJxOCm2HIsaW0hafu7q0OmrA/exec";

const peers=new Map();
let active=null;

const cfg={
iceServers:[
{urls:"stun:stun.l.google.com:19302"},
{urls:"stun:stun1.l.google.com:19302"}
]};

const id=()=>"p_"+Math.random().toString(36).slice(2,8);

async function api(action,data={}){
  if(action=="list"){
    const r=await fetch(GAS,{method:"POST",body:JSON.stringify({action})});
    return await r.json();
  }
  await fetch(GAS,{
    method:"POST",
    mode:"no-cors",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,...data})
  });
  return {success:true};
}

function log(t,c="sys"){
  let d=document.createElement("div");
  d.className="msg "+c;
  d.textContent=t;
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
}

function draw(){
  send.disabled =!active || peers.get(active)?.dc?.readyState!== "open";
  status.textContent = active? "Online" : "Belum Konek";
}

// FIX: Gabung semua event di sini biar ga ketimpa
function setupPeer(id){
  let p=peers.get(id);

  p.pc.onicecandidate=async()=>{
    if(!p.pc.localDescription)return;
    const data=JSON.stringify({
      id:id,
      type:p.pc.localDescription.type,
      sdp:p.pc.localDescription
    });
    localSDP.value=data;
  };

  p.pc.onconnectionstatechange=()=>{
    log(`${id}: ${p.pc.connectionState}`);
  }
}

function setupDC(id){
  let p=peers.get(id);

  p.dc.onopen=()=>{
    if(!active) active=id;
    peerName.textContent=id;
    draw(); // draw yg urus status
    log(`${id} Konek`);
  };

  p.dc.onmessage=e=>log(e.data,"peer");

  p.dc.onclose=()=>{
    log(`${id} Putus`);
    peers.delete(id);
    if(active==id)active=[...peers.keys()][0];
    draw();
  };
}

$("btnOffer").onclick=async()=>{
  let pid=id();
  let peer={pc:new RTCPeerConnection(cfg),dc:null};
  peer.dc=peer.pc.createDataChannel("chat");
  peers.set(pid,peer);

  setupPeer(pid);
  setupDC(pid); // penting: set DC langsung

  let offer=await peer.pc.createOffer();
  await peer.pc.setLocalDescription(offer);

  const offerData=JSON.stringify({id:pid,type:"offer",sdp:peer.pc.localDescription});
  localSDP.value=offerData;
  await api("save",{text:offerData});
  log("Offer dibuat & dikirim");
};

$("btnAnswer").onclick=async()=>{
try{
  const offer = await getLatestOffer();
  if(!offer){ log("Belum ada Offer"); return; }

  let {id,sdp}=offer;
  let p=peers.get(id);

  if(!p){
    p={pc:new RTCPeerConnection(cfg),dc:null};
    peers.set(id,p);
    setupPeer(id);

    p.pc.ondatachannel=e=>{
      p.dc=e.channel;
      setupDC(id); // FIX: set DC untuk answerer
    };
  }

  if(sdp.type=="offer"){
    await p.pc.setRemoteDescription(sdp);
    let ans=await p.pc.createAnswer();
    await p.pc.setLocalDescription(ans);

    const answerData=JSON.stringify({id:id,type:"answer",sdp:p.pc.localDescription});
    localSDP.value=answerData;
    await api("save",{text:answerData});
    log("Answer dibuat & dikirim");
  }
  remoteSDP.value="";
}catch(e){ log("Kode salah: "+e.message); }
};

$("btnGetAnswer").onclick=async()=>{
try{
  const r=await api("list");
  if(!r.success){ log("Gagal ambil data"); return; }

  for(let i=r.data.length-1;i>=0;i--){
    try{
      const d=JSON.parse(r.data[i].text);
      if(d.type=="answer"){
        let p=[...peers.values()][0]; // ambil peer pertama yg kita buat

        if(!p){ log("Peer tidak ada"); return; }

        await p.pc.setRemoteDescription(d.sdp);
        active=[...peers.keys()][0]; // FIX: pakai id yg bener

        // FIX: jangan timpa onopen. Cukup draw
        draw();

        log("Koneksi berhasil");
      }
    }catch(e){}
  }
}catch(e){ log("Gagal ambil jawaban"); }
};

$("btnSend").onclick=()=>{
  console.log("Active:", active, peers.get(active));
  if(!active)return;
  let p=peers.get(active);
  if(p && p.dc && p.dc.readyState=="open" && msg.value){
    p.dc.send(msg.value);
    log(msg.value,"me");
    msg.value="";
  }
};

msg.onkeypress=e=>{if(e.key=="Enter")$("btnSend").click();};

const btnCopy = $("btnCopy");
if(btnCopy){
  btnCopy.onclick = async () => {
    if(!localSDP.value) return;
    localSDP.focus();
    localSDP.select();
    try{ await navigator.clipboard.writeText(localSDP.value); }catch(e){ document.execCommand("copy"); }
    log("Kode disalin");
  };
}

const btnSetting=$("btnSetting");
if(btnSetting){
  btnSetting.onclick=()=>{ $("connectionBox").classList.toggle("hidden"); };
}

async function getLatestOffer(){
  const r = await api("list");
  if(!r.success) return null;
  for(let i=r.data.length-1;i>=0;i--){
    try{
      const d=JSON.parse(r.data[i].text);
      if(d.type=="offer"){ return d; }
    }catch(e){}
  }
  return null;
}