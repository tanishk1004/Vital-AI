import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "YOUR_CLAUDE_API_KEY";

// 🔹 API ROUTE
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 700,
        system: `
You are VitalAI, a medical assistant.

Format:
**Severity:** 🟢 🟡 🔴 🚨
**Assessment:** ...
**What to do:** ...
**Next question:** ...

Always include disclaimer.
`,
        messages
      })
    });

    const data = await response.json();

    res.json({
      reply: data.content?.[0]?.text || "No response"
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 FRONTEND PAGE
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>VitalAI</title>
<style>
body { font-family: Arial; background:#0a1628; color:white; }
.chat { max-width:600px; margin:auto; padding:20px; }
.msg { margin:10px 0; }
.user { text-align:right; color:#00c9a7; }
.ai { text-align:left; }
button { margin:5px; padding:8px; cursor:pointer; }
input { padding:10px; width:70%; }
</style>
</head>
<body>

<div class="chat">
<h2>🧠 VitalAI - Smart Healthcare Assistant</h2>

<div id="messages"></div>

<input id="input" placeholder="Enter symptoms..." />
<button onclick="send()">Send</button>

<br/>
<button onclick="voice()">🎤</button>
<button onclick="emergency()">🚨</button>
<button onclick="findHospitals()">📍</button>
<button onclick="download()">📄</button>

<br/><br/>
<input id="med" placeholder="Medicine name"/>
<button onclick="checkMed()">💊 Check</button>

</div>

<script>
let messages = JSON.parse(localStorage.getItem("chat")) || [];
const div = document.getElementById("messages");

function render() {
  div.innerHTML = "";
  messages.forEach(m => {
    const el = document.createElement("div");
    el.className = "msg " + (m.role === "user" ? "user" : "ai");
    el.innerText = m.content;
    div.appendChild(el);
  });
  localStorage.setItem("chat", JSON.stringify(messages));
}

async function send() {
  const input = document.getElementById("input");
  const text = input.value;
  if (!text) return;

  messages.push({ role:"user", content:text });
  render();
  input.value = "";

  const res = await fetch("/chat", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await res.json();

  messages.push({ role:"assistant", content:data.reply });
  render();
}

function voice() {
  const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  rec.onresult = e => {
    document.getElementById("input").value = e.results[0][0].transcript;
  };
  rec.start();
}

function emergency() {
  messages.push({ role:"assistant", content:"🚨 Call emergency services immediately!" });
  render();
}

function findHospitals() {
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude, longitude} = pos.coords;
    window.open(\`https://www.google.com/maps/search/hospitals/@\${latitude},\${longitude},15z\`);
  });
}

async function checkMed() {
  const med = document.getElementById("med").value;

  const res = await fetch("/chat", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      messages: [{ role:"user", content:"Explain uses and side effects of " + med }]
    })
  });

  const data = await res.json();
  messages.push({ role:"assistant", content:data.reply });
  render();
}

function download() {
  let text = "VitalAI Report\\n\\n";
  messages.forEach(m => text += m.role + ": " + m.content + "\\n\\n");

  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "report.txt";
  a.click();
}

render();
</script>

</body>
</html>
`);
});

app.listen(5000, () => console.log("🚀 Running on http://localhost:5000"));
