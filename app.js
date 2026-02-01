// رحلة في جمال الإسلام — MVP كامل ومرتب
// التسجيل في Service Worker لتحويل الموقع لتطبيق PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("Service Worker Registered!", reg))
      .catch((err) => console.log("Service Worker Failed!", err));
  });
}
const TOTAL_PAGES = 604;

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function loadJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch{
    return fallback;
  }
}

// ---------- Settings ----------
const settings = loadJSON("rj_settings", { ramadan: false, city: "" });

// ---------- Theme ----------
const themeToggle = $("#themeToggle");
function applyTheme(isRamadan){
  document.body.classList.toggle("ramadan", !!isRamadan);
  themeToggle.setAttribute("aria-pressed", String(!!isRamadan));
  themeToggle.textContent = isRamadan ? "✨ وضع رمضان مُفعّل" : "🌙 وضع رمضان";
}
applyTheme(settings.ramadan);

themeToggle.addEventListener("click", () => {
  settings.ramadan = !settings.ramadan;
  saveJSON("rj_settings", settings);
  applyTheme(settings.ramadan);
});

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
  });
});

// ---------- Progress ----------
const progressState = loadJSON("rj_progress", { done: 0, suggestion: null });
const donePagesEl = $("#donePages");
const leftPagesEl = $("#leftPages");
const fillEl = $("#progressFill");

function renderProgress(){
  const done = clamp(Number(progressState.done) || 0, 0, TOTAL_PAGES);
  const left = TOTAL_PAGES - done;
  const pct = (done / TOTAL_PAGES) * 100;

  donePagesEl.textContent = done;
  leftPagesEl.textContent = left;
  fillEl.style.width = `${pct}%`;

  if(progressState.suggestion){
    $("#todaySuggestion").textContent = progressState.suggestion;
  }
}

function setDone(delta){
  progressState.done = clamp((Number(progressState.done) || 0) + delta, 0, TOTAL_PAGES);
  saveJSON("rj_progress", progressState);
  renderProgress();
}

$("#minusBtn").addEventListener("click", () => setDone(-1));
$("#plusBtn").addEventListener("click", () => setDone(+1));
$("#add5Btn").addEventListener("click", () => setDone(+5));

$("#resetProgress").addEventListener("click", () => {
  localStorage.removeItem("rj_progress");
  progressState.done = 0;
  progressState.suggestion = null;
  saveJSON("rj_progress", progressState);
  renderProgress();
});

// ---------- Smart Khatma ----------
function setSuggestionText(pagesPerDay, days){
  const today = `اقرأ اليوم: ${pagesPerDay} صفحة (لتنهي خلال ${days} يوم)`;
  progressState.suggestion = today;
  saveJSON("rj_progress", progressState);
  renderProgress();
}

$("#calcByPagesBtn").addEventListener("click", () => {
  const ppd = clamp(parseInt($("#pagesPerDay").value) || 1, 1, TOTAL_PAGES);
  const days = Math.ceil(TOTAL_PAGES / ppd);
  $("#resultPages").innerHTML = `إذا قرأت <strong>${ppd}</strong> صفحة يوميًا → تنهي خلال <strong>${days}</strong> يوم.`;
  setSuggestionText(ppd, days);
});

$("#calcByDaysBtn").addEventListener("click", () => {
  const days = clamp(parseInt($("#daysToFinish").value) || 1, 1, 365);
  const ppd = Math.ceil(TOTAL_PAGES / days);
  $("#resultDays").innerHTML = `لإنهاء المصحف خلال <strong>${days}</strong> يوم → <strong>${ppd}</strong> صفحة يوميًا.`;
  setSuggestionText(ppd, days);
});

// ---------- Quran Verse ----------
async function loadRandomVerse() {
  try {
    const ayahNumber = Math.floor(Math.random() * 6236) + 1;
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.asad`);
    const data = await res.json();
    const ayah = data.data;
    $("#verseText").textContent = ayah.text;
    $("#verseMeta").textContent = `${ayah.surah.name} - آية ${ayah.numberInSurah}`;
  } catch {
    $("#verseText").textContent = "تعذر تحميل الآية حالياً";
  }
}
loadRandomVerse();

// ---------- Prayer Times ----------
const cityInput = $("#cityInput");
const setCityBtn = $("#setCityBtn");
const iftarCountdownEl = $("#iftarCountdown");
const iftarMetaEl = $("#iftarMeta");

let iftarTime = null;

async function fetchPrayerTimes(city) {
  try {
    const today = new Date();
    const url = `https://api.aladhan.com/v1/timingsByCity/${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}?city=${city}&country=Israel&method=2`;
    const res = await fetch(url);
    const data = await res.json();
    iftarTime = data.data.timings.Maghrib;
    iftarMetaEl.textContent = `المدينة: ${city} — المغرب: ${iftarTime}`;
  } catch {
    iftarMetaEl.textContent = "تعذر جلب مواقيت الصلاة";
  }
}

function parseTimeToDate(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function tickCountdownReal() {
  if (!iftarTime) return;
  const now = new Date();
  let target = parseTimeToDate(iftarTime);
  if (now > target) target.setDate(target.getDate() + 1);

  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  iftarCountdownEl.textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
setInterval(tickCountdownReal, 1000);

// ---------- City Detection ----------
async function detectCityByIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const city = data.city;
    if (city) {
      settings.city = city;
      saveJSON("rj_settings", settings);
      cityInput.value = city;
      fetchPrayerTimes(city);
    }
  } catch {}
}

async function detectCityByGPS() {
  if (!navigator.geolocation) return detectCityByIP();

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      if (city) {
        settings.city = city;
        saveJSON("rj_settings", settings);
        cityInput.value = city;
        fetchPrayerTimes(city);
      } else {
        detectCityByIP();
      }
    } catch {
      detectCityByIP();
    }
  }, () => detectCityByIP());
}

function setCity(){
  const city = cityInput.value.trim();
  if(!city) return;
  settings.city = city;
  saveJSON("rj_settings", settings);
  fetchPrayerTimes(city);
}

setCityBtn.addEventListener("click", setCity);
cityInput.addEventListener("keydown", (e) => { if(e.key === "Enter") setCity(); });

if(settings.city){
  cityInput.value = settings.city;
  fetchPrayerTimes(settings.city);
} else {
  detectCityByGPS();
}

renderProgress();
// ---------- Interactive Quran ----------
document.addEventListener("DOMContentLoaded", () => {

const tafsirModal = $("#tafsirModal");
const tafsirTextEl = $("#tafsirText");
const tafsirTitleEl = $("#tafsirTitle");
const closeModalBtn = $("#closeModal");
const modalOverlay = $("#modalOverlay");
const modalContent = document.querySelector(".modal-content");

function openModal() {
  tafsirModal.classList.remove("hidden");
}

function closeModal() {
  tafsirModal.classList.add("hidden");
  modalContent.style.transform = "translateY(0)";
}

closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

// ESC إغلاق
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !tafsirModal.classList.contains("hidden")) {
    closeModal();
  }
});

// Swipe Down للموبايل
let startY = 0;
let currentY = 0;
let isDragging = false;

modalContent.addEventListener("touchstart", (e) => {
  startY = e.touches[0].clientY;
  isDragging = true;
});

modalContent.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  currentY = e.touches[0].clientY;
  const diff = currentY - startY;

  if (diff > 0) {
    modalContent.style.transform = `translateY(${diff}px)`;
  }
});

modalContent.addEventListener("touchend", () => {
  isDragging = false;
  const diff = currentY - startY;

  if (diff > 120) {
    closeModal();
  } else {
    modalContent.style.transform = "translateY(0)";
  }
});

// عناصر المصحف
const surahSelect = $("#surahSelect");
const ayahContainer = $("#ayahContainer");
const playAudioBtn = $("#playAudioBtn");
const pauseAudioBtn = $("#pauseAudioBtn");
const stopAudioBtn = $("#stopAudioBtn");
const currentAyahNumEl = $("#currentAyahNum");
const audioProgressFill = $("#audioProgressFill");

let currentAyahAudios = [];
let currentAyahIndex = 0;
let surahAudioPlayer = new Audio();
let isPlaying = false;

// تحميل قائمة السور
async function loadSurahs() {
  const res = await fetch("https://api.alquran.cloud/v1/surah");
  const data = await res.json();

  data.data.forEach(surah => {
    const option = document.createElement("option");
    option.value = surah.number;
    option.textContent = `${surah.number}. ${surah.name}`;
    surahSelect.appendChild(option);
  });
}

// تحميل السورة
async function loadSurah(surahNumber) {
  ayahContainer.innerHTML = "جارٍ تحميل الآيات...";
  currentAyahAudios = [];
  currentAyahIndex = 0;
  stopPlayback();

  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`);
  const data = await res.json();

  ayahContainer.innerHTML = "";

  data.data.ayahs.forEach(ayah => {
    const span = document.createElement("span");
    span.className = "ayah";
    span.textContent = ` ${ayah.text} (${ayah.numberInSurah}) `;
    span.addEventListener("click", () => loadTafsir(ayah.number));
    ayahContainer.appendChild(span);

    currentAyahAudios.push(ayah.audio);
  });
}

// تشغيل متسلسل
function playNextAyah() {
  if (currentAyahIndex >= currentAyahAudios.length) {
    stopPlayback();
    return;
  }

  surahAudioPlayer.src = currentAyahAudios[currentAyahIndex];
  surahAudioPlayer.play().then(() => {
    isPlaying = true;
    currentAyahNumEl.textContent = currentAyahIndex + 1;
  });

  surahAudioPlayer.onended = () => {
    currentAyahIndex++;
    playNextAyah();
  };

  surahAudioPlayer.ontimeupdate = () => {
    const progress = (surahAudioPlayer.currentTime / surahAudioPlayer.duration) * 100;
    audioProgressFill.style.width = `${progress}%`;
  };
}

function stopPlayback() {
  surahAudioPlayer.pause();
  surahAudioPlayer.currentTime = 0;
  audioProgressFill.style.width = "0%";
  currentAyahIndex = 0;
  isPlaying = false;
  currentAyahNumEl.textContent = "—";
}

playAudioBtn.addEventListener("click", () => {
  if (!currentAyahAudios.length) return;
  if (!isPlaying) playNextAyah();
});

pauseAudioBtn.addEventListener("click", () => {
  surahAudioPlayer.pause();
  isPlaying = false;
});

stopAudioBtn.addEventListener("click", stopPlayback);

surahSelect.addEventListener("change", e => loadSurah(e.target.value));

// التفسير
async function loadTafsir(ayahNumber) {
  const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.muyassar`);
  const data = await res.json();

  tafsirTitleEl.textContent = `تفسير الآية ${ayahNumber}`;
  tafsirTextEl.textContent = data.data.text;
  openModal();
}

// بدء
loadSurahs();
loadSurah(1);

});
// ---------- Soul Pharmacy (Dynamic) ----------
const spiritualAyahEl = $("#spiritualAyah");
const spiritualDhikrEl = $("#spiritualDhikr");
const spiritualDuaEl = $("#spiritualDua");
const spiritualTitleEl = $("#spiritualTitle");

// آية عشوائية من القرآن
async function getRandomAyah() {
  const num = Math.floor(Math.random() * 6236) + 1;
  const res = await fetch(`https://api.alquran.cloud/v1/ayah/${num}/ar`);
  const data = await res.json();
  return `﴿ ${data.data.text} ﴾ — ${data.data.surah.name} ${data.data.numberInSurah}`;
}

// ذكر عشوائي
async function getRandomDhikr() {
  const res = await fetch("https://api.hadith.gading.dev/books/muslim?range=1-300");
  const data = await res.json();
  const hadiths = data.data.hadiths;
  const random = hadiths[Math.floor(Math.random() * hadiths.length)];
  return random.arab;
}

// دعاء عشوائي (من Quranic duas)
async function getRandomDua() {
  const duas = [
    "رَبِّ اشْرَحْ لِي صَدْرِي",
    "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا",
    "رَبِّ زِدْنِي عِلْمًا",
    "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
    "اللهم إنّي أسألك الهدى والتقى والعفاف والغنى"
  ];
  return duas[Math.floor(Math.random() * duas.length)];
}

async function loadSpiritualDose(feeling) {
  spiritualTitleEl.textContent = "جاري تجهيز الجرعة الروحية...";

  try {
    const ayah = await getRandomAyah();
    const dhikr = await getRandomDhikr();
    const dua = await getRandomDua();

    spiritualTitleEl.textContent = "جرعتك الروحية الآن 🤍";
    spiritualAyahEl.textContent = `📖 ${ayah}`;
    spiritualDhikrEl.textContent = `🕊 ${dhikr}`;
    spiritualDuaEl.textContent = `🤲 ${dua}`;

  } catch (err) {
    spiritualTitleEl.textContent = "تعذر جلب الجرعة الآن";
  }
}

document.querySelectorAll(".feeling-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    loadSpiritualDose(btn.dataset.feeling);
  });
});

