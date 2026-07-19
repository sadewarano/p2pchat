const LOCAL_STORAGE_KEY = "LOKAL_PRODUK_DB";

let db = [];
let editId = null;

const list = document.getElementById("produkList");
const dlg = document.getElementById("dlgProduk");
const nama = document.getElementById("namaProduk");
const txtCari = document.getElementById("txtCari");
const inputImport = document.getElementById("inputImport");
const links = [...Array(6)].map((_, i) => document.getElementById("link" + (i + 1)));

// Event Handlers Toolbar
document.getElementById("btnTambah").onclick = tambahProduk;
document.getElementById("btnBatal").onclick = () => dlg.close();
document.getElementById("btnSimpan").onclick = simpan;
document.getElementById("btnExport").onclick = eksporJSON;
document.getElementById("btnHapusSemua").onclick = hapusSemuaProduk;
inputImport.onchange = imporJSON;
txtCari.oninput = render; // FIX 7: Memicu render ulang saat mengetik kata kunci pencarian

// FIX 5: Proteksi Siklus Dialog. Menghapus jejak ID lama jika modal ditutup paksa (cth: tombol ESC)
dlg.addEventListener("close", () => {
  editId = null;
});

// Jalankan sistem pertama kali
load();

// FIX 2: Sanitasi Input (Anti-XSS Injection)
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// FIX 3: Imlementasi Try-Catch Terhadap Kerusakan Data / Korupsi JSON LocalStorage
function load() {
  try {
    const dataLokal = localStorage.getItem(LOCAL_STORAGE_KEY);
    db = dataLokal ? JSON.parse(dataLokal) : [];
    if (!Array.isArray(db)) db = []; // Memastikan struktur mutlak berupa array
  } catch (e) {
    console.error("Gagal memproses JSON localStorage korup:", e);
    db = [];
  }
  render();
}

function simpanLokal() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

function render() {
  // FIX 6: Standarisasi Pengurutan Data Konstan (Berdasarkan ID String Terbesar / Terbaru Di Atas)
  db.sort((a, b) => b.id.localeCompare(a.id));

  // FIX 7: Fitur Live Filter Pencarian Produk
  const keyword = txtCari.value.trim().toLowerCase();
  const dataTerfilter = db.filter(p => p.nama.toLowerCase().includes(keyword));

  if (!dataTerfilter.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p style="margin:0; font-size:1.1rem; font-weight:600;">Data tidak ditemukan</p>
        <p style="margin:5px 0 0 0; font-size:0.9rem;">Coba periksa kembali kata kunci atau tambah produk baru.</p>
      </div>`;
    return;
  }

  // FIX 2: Penerapan escapeHtml() di seluruh pencetakan string dinamis
  list.innerHTML = dataTerfilter.map(p => `
    <article class="product-card">
      <div>
        <h3>${escapeHtml(p.nama)}</h3>
        <div class="link-badge-list">
          ${p.links.map((v, i) => {
            if (v) {
              return `
                <div class="link-item">
                  <span class="link-label">Link ${i + 1} :</span>
                  <span class="link-value">${escapeHtml(v)}</span>
                </div>`;
            } else {
              return `
                <div class="link-item empty">
                  <span class="link-label">Link ${i + 1} :</span>
                  <span class="link-value">- Kosong -</span>
                </div>`;
            }
          }).join("")}
        </div>
      </div>

      <div class="card-actions">
        <button class="btn-copy-all" onclick="copyAll('${p.id}')">📋 Copy All</button>
        <button class="btn-edit" onclick="editProduk('${p.id}')">✏️ Edit</button>
        <button class="btn-delete" onclick="hapusProduk('${p.id}')">🗑️ Hapus</button>
      </div>
    </article>
  `).join("");
}

function tambahProduk() {
  editId = null;
  nama.value = "";
  links.forEach(x => x.value = "");
  document.getElementById("dlgTitle").innerText = "Tambah Produk Baru";
  dlg.showModal();
}

function editProduk(id) {
  const p = db.find(x => x.id === id);
  if (!p) return;

  editId = id;
  nama.value = p.nama;
  links.forEach((x, i) => x.value = p.links[i] || "");
  document.getElementById("dlgTitle").innerText = "Edit Produk";
  dlg.showModal();
}

function simpan() {
  const namaValue = nama.value.trim();
  if (!namaValue) {
    alert("Nama produk tidak boleh kosong!");
    return;
  }

  const data = {
    id: editId || Date.now().toString(), // Menggunakan timestamp string konstan untuk id unik
    nama: namaValue,
    links: links.map(x => x.value.trim())
  };

  if (editId) {
    const index = db.findIndex(x => x.id === editId);
    if (index > -1) db[index] = data;
  } else {
    db.push(data); // Penyisipan biasa, urutan tampilan diatur penuh oleh sorting di render()
  }

  simpanLokal();
  dlg.close();
  render();
}

function hapusProduk(id) {
  if (!confirm("Hapus produk ini?")) return;
  db = db.filter(x => x.id !== id);
  simpanLokal();
  render();
}

function hapusSemuaProduk() {
  if (db.length === 0) {
    alert("Database sudah kosong.");
    return;
  }
  if (!confirm("⚠️ PERINGATAN: Anda akan menghapus SELURUH data produk secara permanen. Lanjutkan?")) return;
  db = [];
  simpanLokal();
  render();
}

// FIX 4: Dukungan Clipboard dengan Sistem Fallback Teksarea untuk Browser Jadul / HP Tertentu
function copyAll(id) {
  const p = db.find(x => x.id === id);
  if (!p) return;

  const teksLink = p.links.filter(Boolean).join("\n");
  if (!teksLink) {
    alert("Tidak ada link untuk disalin.");
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(teksLink)
      .then(() => alert("Semua link berhasil disalin!"))
      .catch(() => fallbackCopy(teksLink));
  } else {
    fallbackCopy(teksLink);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; // Hindari efek scrolling halaman saat elemen dibuat
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    alert("Semua link berhasil disalin! (via fallback)");
  } catch (err) {
    alert("Gagal menyalin data, silakan salin manual.");
  }
  document.body.removeChild(textArea);
}

// FIX 8: Fitur Ekspor Data ke File (.json) Berbasis Unduhan Otomatis
function eksporJSON() {
  if (!db.length) {
    alert("Tidak ada data produk yang bisa diekspor.");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Backup_DB_Produk_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// FIX 8: Fitur Impor Data dengan Validasi Struktur JSON yang Ketat
function imporJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const dataImpor = JSON.parse(event.target.result);
      
      // Validasi struktur minimal apakah file yang dimasukkan kompatibel
      if (Array.isArray(dataImpor)) {
        if (confirm("Impor data akan menggabungkan data lama Anda dengan data dari file ini. Lanjutkan?")) {
          // Gabung data baru & filter ID duplikat agar tidak merusak sistem keying
          const mapIdLama = new Set(db.map(item => item.id));
          dataImpor.forEach(item => {
            if (item.id && item.nama && Array.isArray(item.links)) {
              if (!mapIdLama.has(item.id)) {
                db.push(item);
              } else {
                // Jika ID bentrok/sama, buat ID baru agar data hasil impor tidak menimpa data lama
                item.id = (Date.now() + Math.random()).toString();
                db.push(item);
              }
            }
          });
          simpanLokal();
          render();
          alert("Data berhasil diimpor!");
        }
      } else {
        alert("Format file tidak valid. Pastikan file berupa backup JSON database produk resmi.");
      }
    } catch (err) {
      alert("Gagal membaca file JSON korup atau rusak.");
    }
    inputImport.value = ""; // Reset input file agar bisa memilih file yang sama di kemudian waktu
  };
  reader.readAsText(file);
}
