const $=id=>document.getElementById(id);

const localSDP=$("localSDP"),
remoteSDP=$("remoteSDP"),
chat=$("chatBox"),
msg=$("msgInput"),
send=$("btnSend"),
list=$("peerList"),
status=$("status");

let active=null;


function log(t,c="sys"){
  const d=document.createElement("div");
  d.className="msg "+c;
  d.textContent=t;
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
}


function draw(){
  list.innerHTML="";

  peers.forEach((p,id)=>{
    const b=document.createElement("button");
    b.className="peer-btn "+(id==active?"active":"");
    b.textContent=id;
    b.onclick=()=>{
      active=id;
      draw();
    };
    list.appendChild(b);
  });

  send.disabled=
    !active ||
    peers.get(active)?.dc?.readyState!="open";
}


// BUAT OFFER
$("btnOffer").onclick=async()=>{

  localSDP.value=
    await makeOffer();

  log("Offer dibuat");
};


// PROSES OFFER / ANSWER
$("btnAnswer").onclick=async()=>{

  try{

    const code=
      await makeAnswer(remoteSDP.value);

    if(code)
      localSDP.value=code;

    remoteSDP.value="";

  }catch(e){

    log("Kode salah");

  }

};


// COPY
$("btnCopy").onclick=async()=>{

  if(!localSDP.value)return;

  await navigator.clipboard
    .writeText(localSDP.value);

  log("Kode disalin");

};


// KIRIM CHAT
send.onclick=()=>{

  if(!active)return;

  if(msg.value){

    sendPeer(active,msg.value);

    log(msg.value,"me");

    msg.value="";
  }

};


msg.onkeypress=e=>{
  if(e.key=="Enter")
    send.click();
};


// EVENT DARI peer.js

function peerOpen(id){

  if(!active)
    active=id;

  status.textContent=
    "Konek : "+id;

  draw();
}


function peerMessage(id,text){

  log(id+": "+text,"peer");

}


function peerClose(id){

  log(id+" putus");

  if(active==id)
    active=null;

  draw();
}