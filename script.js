const API = "https://script.google.com/macros/s/AKfycbx2-mWve8gGuaDgmCebkyUXTZEobgNX6TmUEA1jXT8wfx2l-dvaNRdzOYUXZ04N3aJ_/exec";

/* ---------------- LOGIN & SIGNUP ---------------- */
async function signup() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) { alert("Fill all fields"); return; }

  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({ action: "signup", username: username, password: password })
  });

  const data = await res.json();
  alert(data.msg);
  if (data.success) location = "index.html";
}

async function login(role) {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!username || !password) { alert("Fill all fields"); return; }

  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({ action: "login", username: username, password: password })
  });

  const data = await res.json();
  if (!data.success) { alert(data.msg); return; }

  localStorage.user = username;
  if (role === "admin") location = "admin.html";
  else location = "user.html";
}

async function changePassword() {
  const oldPassword = document.getElementById("oldPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  if (!oldPassword || !newPassword) { alert("Fill all fields"); return; }

  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "changePassword",
      username: localStorage.user,
      oldPassword: oldPassword,
      newPassword: newPassword
    })
  });
  const data = await res.json();
  alert(data.msg);
}

/* ---------------- USER FUNCTIONS ---------------- */
async function submitComplaint(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.innerText = "Submitting...";
  btn.disabled = true;

  const room = document.getElementById("room").value.trim();
  const complaint = document.getElementById("complaint").value.trim();
  if(!room || !complaint){ alert("Fill all fields"); btn.innerText="Submit Complaint"; btn.disabled=false; return;}

  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "submit",
      username: localStorage.user,
      room,
      complaint
    })
  });

  const data = await res.json();
  btn.innerText = data.success ? "Submitted" : "Failed";
  btn.disabled = false;
  loadUser();
}

async function loadUser() {
  const res = await fetch(API);
  const data = await res.json();
  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach((c,i)=>{
    if(c[1].toString().trim() === localStorage.user){
      const created = new Date(c[4]);
      const resolved = c[7] ? new Date(c[7]) : null;
      const hrs = (Date.now() - created)/36e5;
      const overdue = !c[6] && hrs>48 ? "overdue" : "";

      list.innerHTML += `
      <div class="card ${overdue}">
        <b>Room:</b> ${c[2]}<br>
        <b>Status:</b> ${c[5]}<br>
        <small>Registered: ${created.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</small>
        <small>Resolved: ${resolved ? resolved.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}) : "Not yet"}</small>
        ${!c[6] ? `<button onclick="resolve(${i})">Mark Resolved</button>
                    <button onclick="userDelete(${i})">Delete</button>` : ""}
        <button onclick="openChat(${i})">Chat</button>
        <div id="chat-${i}" style="margin-top:10px;"></div>
      </div>`;
    }
  });
}

async function resolve(id){
  const btnText = document.createElement("span");
  btnText.innerText = "Resolving...";
  await fetch(API, { method:"POST", body:JSON.stringify({action:"resolve",id}) });
  loadUser();
}

async function userDelete(id){
  const btnText = document.createElement("span");
  btnText.innerText = "Deleting...";
  await fetch(API, { method:"POST", body:JSON.stringify({action:"userDelete",id}) });
  loadUser();
}

/* ---------------- ADMIN FUNCTIONS ---------------- */
async function loadAdmin(){
  const res = await fetch(API);
  const data = await res.json();
  const list = document.getElementById("adminList");
  list.innerHTML = "";

  data.sort((a,b)=>new Date(a[4])-new Date(b[4])).forEach((c,i)=>{
    const created = new Date(c[4]);
    const resolved = c[7] ? new Date(c[7]) : null;
    const hrs = (Date.now() - created)/36e5;
    const overdue = !c[6] && hrs>48 ? "overdue" : "";

    list.innerHTML += `
      <div class="card ${overdue}">
        <b>User:</b> ${c[1]}<br>
        <b>Room:</b> ${c[2]}<br>
        <b>Progress:</b> ${c[5]}<br>
        <small>Registered: ${created.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</small>
        <small>Resolved: ${resolved ? resolved.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}) : "Not yet"}</small>

        <select id="progress-${i}">
          <option disabled selected>Update Progress</option>
          <option>Assigned</option>
          <option>In Progress</option>
          <option>Maintenance Ongoing</option>
        </select>
        <button onclick="saveProgress(${i})">Save</button>

        ${c[6] ? `<button onclick="adminDelete(${i})">Delete</button>` : ""}
        <button onclick="openChat(${i},true)">Chat</button>
        <div id="chat-${i}" style="margin-top:10px;"></div>
      </div>`;
  });
}

async function saveProgress(id){
  const sel = document.getElementById(`progress-${id}`);
  const progress = sel.value;
  const btn = sel.nextElementSibling;
  btn.innerText = "Saving...";
  await fetch(API, {method:"POST", body:JSON.stringify({action:"progress",id,progress})});
  btn.innerText = "Saved";
  loadAdmin();
}

async function adminDelete(id){
  await fetch(API, {method:"POST", body:JSON.stringify({action:"adminDelete",id})});
  loadAdmin();
}

/* ---------------- CHAT ---------------- */
async function openChat(id,isAdmin=false){
  const chatDiv = document.getElementById(`chat-${id}`);
  chatDiv.innerHTML = `<input id="msg-${id}" placeholder="Type message">
                       <button onclick="sendChat(${id},${isAdmin})">Send</button>
                       <div id="messages-${id}"></div>`;
  loadChat(id);
}

async function sendChat(id,isAdmin){
  const msg = document.getElementById(`msg-${id}`).value.trim();
  if(!msg) return;
  await fetch(API,{method:"POST",body:JSON.stringify({
    action:"chat", id, sender: localStorage.user, message: msg
  })});
  document.getElementById(`msg-${id}`).value="";
  loadChat(id);
}

async function loadChat(id){
  const res = await fetch(`${API}?chat=${id}`);
  const msgs = await res.json();
  const div = document.getElementById(`messages-${id}`);
  div.innerHTML = msgs.map(m=>`<b>${m[1]}:</b> ${m[2]} <small>${new Date(m[3]).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</small>`).join("<br>");
  setTimeout(()=>loadChat(id),5000); // auto-refresh every 5 sec
}