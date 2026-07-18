const $ = id => document.getElementById(id);

const status = $("status");
const peerName = $("peerName");
const chat = $("chatBox");

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
            data.peers.filter(x => x != myId);

            log(
            "Peer online : "
            + peerList.length
            );

            console.log(peerList);

        break;

    }

};