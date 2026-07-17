const $=id=>document.getElementById(id);

const localSDP=$("localSDP"),
remoteSDP=$("remoteSDP"),
chat=$("chatBox"),
msg=$("msgInput"),
send=$("btnSend"),
list=$("peerList"),
status=$("status");


function log(t,c="sys"){
 let d=document.createElement("div");
 d.className="msg "+c;
 d.textContent=t;
 chat.appendChild(d);
 chat.scrollTop=chat.scrollHeight;
}


// update daftar koneksi
function update(){
 list.innerHTML="";

 peers.forEach((p,id)=>{
  let b=document.createElement("button");
  b.textContent=id;
  b.className=id==active?"peer-btn active":"peer-btn";

  b.onclick=()=>{
   active=id;
   update();
  };

  list.appendChild(b);
 });

 send.disabled=
 !active ||
 peers.get(active)?.dc?.readyState!="open";
}


// buat offer
$("btnOffer").onclick=async()=>{

 let id=createPeer();

 let p=peers.get(id);

 p.dc=p.pc.createDataChannel("chat");

 setupDC(id);

 let offer=await p.pc.createOffer();
 await p.pc.setLocalDescription(offer);

 localSDP.value=JSON.stringify({
  id,
  sdp:p.pc.localDescription
 });

 log("Offer dibuat");
};


// proses offer/answer
$("btnAnswer").onclick=async()=>{

 try{

 let data=JSON.parse(remoteSDP.value);

 let id=data.id;
 let p=peers.get(id);


 if(!p){

  p=createPeer(id);

  p.pc.ondatachannel=e=>{
   p.dc=e.channel;
   setupDC(id);
  };
 }


 await p.pc.setRemoteDescription(data.sdp);


 if(data.sdp.type=="offer"){

  let ans=await p.pc.createAnswer();

  await p.pc.setLocalDescription(ans);

  localSDP.value=JSON.stringify({
   id,
   sdp:p.pc.localDescription
  });

 }


 remoteSDP.value="";

 }catch(e){

 log("Kode salah");

 }

};


// kirim chat
send.onclick=()=>{

 let p=peers.get(active);

 if(p?.dc?.readyState=="open" && msg.value){

  p.dc.send(msg.value);

  log(msg.value,"me");

  msg.value="";
 }

};


msg.onkeypress=e=>{
 if(e.key=="Enter")send.click();
};


// copy
$("btnCopy").onclick=()=>{

 navigator.clipboard.writeText(localSDP.value);

 log("Kode disalin");

};