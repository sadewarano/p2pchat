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
    const r=await fetch(GAS,{
      method:"POST",
      body:JSON.stringify({action})
    });

    return await r.json();
  }

  await fetch(GAS,{
    method:"POST",
    mode:"no-cors",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      action,
      ...data
    })
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

send.disabled = !active ||
peers.get(active)?.dc?.readyState !== "open";

}

function dc(id){
let p=peers.get(id);

p.dc.onopen=()=>{

if(!active)
active=id;

peerName.textContent=id;
status.textContent="Online";

draw();

};

p.dc.onmessage=e=>log(e.data,"peer");

p.dc.onclose=()=>{
peers.delete(id);
if(active==id)active=[...peers.keys()][0];
draw();
};
}

function pc(id){
let p=peers.get(id);

p.pc.onicecandidate=async()=>{

if(!p.pc.localDescription)return;

const type=p.pc.localDescription.type;

const data=JSON.stringify({
id:id,
type:type,
sdp:p.pc.localDescription
});

localSDP.value=data;

await api("save",{
text:data
});

};
}
$("btnOffer").onclick=async()=>{

let pid=id();

let peer={
pc:new RTCPeerConnection(cfg),
dc:null
};

peer.dc=peer.pc.createDataChannel("chat");

peers.set(pid,peer);

pc(pid);
dc(pid);

let offer=await peer.pc.createOffer();
await peer.pc.setLocalDescription(offer);

const offerData=JSON.stringify({
id:pid,
type:"offer",
sdp:peer.pc.localDescription
});

localSDP.value=offerData;

await api("save",{
text:offerData
});

log("Offer dibuat & dikirim");

};
$("btnAnswer").onclick=async()=>{

try{

// jika kolom kosong, ambil dari clipboard
if(!remoteSDP.value.trim()){

  remoteSDP.value =
  await navigator.clipboard.readText();

}


// proses kode
let {id,sdp}=JSON.parse(remoteSDP.value);


let p=peers.get(id);


if(!p){

p={
 pc:new RTCPeerConnection(cfg),
 dc:null
};

peers.set(id,p);

pc(id);


p.pc.ondatachannel=e=>{
 p.dc=e.channel;
 dc(id);
};

}



if(sdp.type=="offer"){

await p.pc.setRemoteDescription(sdp);


let ans=await p.pc.createAnswer();

await p.pc.setLocalDescription(ans);


localSDP.value=JSON.stringify({
 id:id,
 sdp:p.pc.localDescription
});


log("Answer dibuat");


}else{


await p.pc.setRemoteDescription(sdp);

log("Koneksi berhasil");


}


remoteSDP.value="";


}catch(e){

log("Kode salah");

}

};

$("btnSend").onclick=()=>{

if(!active)return;

let p=peers.get(active);

if(
p &&
p.dc &&
p.dc.readyState=="open" &&
msg.value
){

p.dc.send(msg.value);

log(msg.value,"me");

msg.value="";

}

};

msg.onkeypress=e=>{
if(e.key=="Enter")
$("btnSend").click();
};

const btnCopy = $("btnCopy");

if(btnCopy){
btnCopy.onclick = async () => {
if(!localSDP.value) return;

localSDP.focus();  
localSDP.select();  

try{  
  await navigator.clipboard.writeText(localSDP.value);  
}catch(e){  
  document.execCommand("copy");  
}  

log("Kode disalin");

};
}

const btnSetting=$("btnSetting");

if(btnSetting){
  btnSetting.onclick=()=>{
    $("connectionBox").classList.toggle("hidden");
  };
}