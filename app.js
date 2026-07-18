const $ = id => document.getElementById(id);

const status = $("status");
const peerName = $("peerName");
const chat = $("chatBox");
const peerListBox = $("peerList");

let myId = "";
let peerList = [];

// Ganti sesuai alamat servermu
const ws = new WebSocket("ws://127.0.0.1:8080");

function log(msg){
    let d = document.createElement("div");
    d.className = "msg sys";
    d.textContent = msg;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

ws.onopen = () => {

    status.textContent = "Terhubung ke Server";

    log("WebSocket Connected");

};

ws.onclose = () => {

    status.textContent = "Server Offline";

    log("WebSocket Closed");

};

ws.onerror = () => {

    status.textContent = "Error";

};

ws.onmessage = e => {

    let data = JSON.parse(e.data);

    switch(data.type){

        case "id":

            myId = data.id;

            peerName.textContent =
            "ID : " + myId;

            log("ID saya : " + myId);

        break;

        case "peers":

    peerList =
    data.peers.filter(x=>x!=myId);

    drawPeers();

    break;

    }

};

function drawPeers(){

    peerListBox.innerHTML = "";

    if(peerList.length === 0){

        peerListBox.innerHTML =
        "<small>Tidak ada peer online</small>";

        return;

    }

    peerList.forEach(id=>{

        let b = document.createElement("button");

        b.textContent = id;

        b.style.display = "block";
        b.style.width = "100%";
        b.style.margin = "5px 0";

        b.onclick = ()=>{

            log("Klik peer : "+id);

            // nanti di Bagian 3
            connectPeer(id);

        };

        peerListBox.appendChild(b);

    });

}

function connectPeer(id){

    log("Connect ke "+id);

}