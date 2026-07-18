
// ===== 1. SELECTOR SINGKAT =====
const $ = id => document.getElementById(id);

// ===== 2. ELEMEN DOM =====
const statusEl   = $("status");
const localSDP   = $("localSDP");
const remoteSDP  = $("remoteSDP");
const chatBox    = $("chatBox");
const msgInput   = $("msgInput");
const btnSend    = $("btnSend");
const peerNameEl = $("peerName");
const btnCopy    = $("btnCopy");
const btnSetting = $("btnSetting");

// ===== 3. KONFIGURASI =====
const GAS_URL = "https://script.google.com/macros/s/AKfycbzIHG5X4pf8CkHVJq3hWas0p6NdYQPd_Hf9uJXhmgd2FkMJxOCm2HIsaW0hafu7q0OmrA/exec";

const peers = new Map();
let activePeerId = null;

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

// ===== 4. HELPER FUNCTIONS =====
const generatePeerId = () => "p_" + Math.random().toString(36).slice(2, 8);

async function api(action, data = {}) {
  if (action == "list") {
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({ action })
    });
    return await res.json();
  }

  await fetch(GAS_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      ...data
    })
  });

  return { success: true };
}

function addLog(text, className = "sys") {
  let div = document.createElement("div");
  div.className = "msg " + className;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateUI() {
  btnSend.disabled = !activePeerId ||
    peers.get(activePeerId)?.dc?.readyState !== "open";
}

// ===== 5. SETUP WEBRTC =====
function setupDataChannel(peerId) {
  let peer = peers.get(peerId);

  peer.dc.onopen = () => {
    if (!activePeerId)
      activePeerId = peerId;

    peerNameEl.textContent = peerId;
    statusEl.textContent = "Online";
    updateUI();
  };

  peer.dc.onmessage = e => addLog(e.data, "peer");

  peer.dc.onclose = () => {
    peers.delete(peerId);
    if (activePeerId == peerId) activePeerId = [...peers.keys()][0];
    updateUI();
  };
}

function setupPeerConnection(peerId) {
  let peer = peers.get(peerId);

  peer.pc.onicecandidate = async (e) => {

  if (e.candidate) return;
    if (!peer.pc.localDescription) return;

    const type = peer.pc.localDescription.type;

    const data = JSON.stringify({
      id: peerId,
      type: type,
      sdp: peer.pc.localDescription
    });

    localSDP.value = data;

    await api("save", {
      text: data
    });
  };
}

// ===== 6. EVENT HANDLER =====
$("btnOffer").onclick = async () => {
  let newPeerId = generatePeerId();

  let newPeer = {
    pc: new RTCPeerConnection(RTC_CONFIG),
    dc: null
  };

  newPeer.dc = newPeer.pc.createDataChannel("chat");
  peers.set(newPeerId, newPeer);

  setupPeerConnection(newPeerId);
  setupDataChannel(newPeerId);

  let offer = await newPeer.pc.createOffer();
  await newPeer.pc.setLocalDescription(offer);

  const offerData = JSON.stringify({
    id: newPeerId,
    type: "offer",
    sdp: newPeer.pc.localDescription
  });

  localSDP.value = offerData;

await api("save",{
  text:offerData
});

addLog("Offer dibuat & dikirim");
};

$("btnAnswer").onclick = async () => {
  try {
    // jika kosong, ambil dari clipboard
    if (!remoteSDP.value.trim()) {
      remoteSDP.value =
        await navigator.clipboard.readText();
    }

    // proses kode
    let { id, sdp } = JSON.parse(remoteSDP.value);
    let peer = peers.get(id);

    if (!peer) {
      peer = {
        pc: new RTCPeerConnection(RTC_CONFIG),
        dc: null
      };

      peers.set(id, peer);
      setupPeerConnection(id);

      peer.pc.ondatachannel = e => {
        peer.dc = e.channel;
        setupDataChannel(id);
      };
    }

    if (sdp.type == "offer") {
      await peer.pc.setRemoteDescription(sdp);
      let answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);

      localSDP.value = JSON.stringify({
        id: id,
        sdp: peer.pc.localDescription
      });

      addLog("Answer dibuat");
    } else {
      await peer.pc.setRemoteDescription(sdp);
      addLog("Koneksi berhasil");
    }

    remoteSDP.value = "";
  } catch (e) {
    addLog("Kode salah");
  }
};

$("btnSend").onclick = () => {
  if (!activePeerId) return;

  let peer = peers.get(activePeerId);

  if (
    peer &&
    peer.dc &&
    peer.dc.readyState == "open" &&
    msgInput.value
  ) {
    peer.dc.send(msgInput.value);
    addLog(msgInput.value, "me");
    msgInput.value = "";
  }
};

msgInput.onkeypress = e => {
  if (e.key == "Enter")
    $("btnSend").click();
};

if (btnCopy) {
  btnCopy.onclick = async () => {
    if (!localSDP.value) return;

    localSDP.focus();
    localSDP.select();

    try {
      await navigator.clipboard.writeText(localSDP.value);
    } catch (e) {
      document.execCommand("copy");
    }

    addLog("Kode disalin");
  };
}

if (btnSetting) {
  btnSetting.onclick = () => {
    $("connectionBox").classList.toggle("hidden");
  };
}

async function getLatestOffer(){

  const r = await api("list");

  if(!r.success) return null;

  for(let i = r.data.length - 1; i >= 0; i--){

    try{

      const d = JSON.parse(r.data[i].text);

      if(d.type == "offer") return d;

    }catch(e){}

  }

  return null;

}
