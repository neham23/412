const baseUrl = "http://localhost:3000";

let currentUserId = localStorage.getItem("userId");
let activePlaylistId = localStorage.getItem("activePlaylistId");
let currentFilter = null;

if (!currentUserId) {
  window.location.href = "login.html";
}

const homeTabBtn = document.getElementById("homeTabBtn");
const playlistTabBtn = document.getElementById("playlistTabBtn");
const homeTab = document.getElementById("homeTab");
const playlistTab = document.getElementById("playlistTab");

const searchBtn = document.getElementById("searchBtn");
const showAllBtn = document.getElementById("showAllBtn");
const logoutBtn = document.getElementById("logoutBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
const playlistSelect = document.getElementById("playlistSelect");

const searchInput = document.getElementById("searchInput");
const newPlaylistName = document.getElementById("newPlaylistName");
const currentUserText = document.getElementById("currentUser");
const gamesList = document.getElementById("gamesList");
const playlistList = document.getElementById("playlistList");
const filterLabel = document.getElementById("filterLabel");
const activePlaylistTitle = document.getElementById("activePlaylistTitle");

const confirmBox = document.createElement("div");
confirmBox.className = "confirm-box";
confirmBox.style.display = "none";
document.body.appendChild(confirmBox);

currentUserText.textContent = `Logged in as User ${currentUserId}`;

homeTabBtn.addEventListener("click", () => showTab("home"));
playlistTabBtn.addEventListener("click", () => showTab("playlists"));
searchBtn.addEventListener("click", searchGames);
showAllBtn.addEventListener("click", showAllGames);
logoutBtn.addEventListener("click", logout);
clearFilterBtn.addEventListener("click", clearFilter);
createPlaylistBtn.addEventListener("click", createPlaylist);

if (deletePlaylistBtn) {
  deletePlaylistBtn.addEventListener("click", deletePlaylist);
}

playlistSelect.addEventListener("change", changePlaylist);

function showMessage(text) {
  confirmBox.textContent = text;
  confirmBox.style.display = "block";

  setTimeout(() => {
    confirmBox.style.display = "none";
  }, 2000);
}

function showTab(tabName) {
  if (tabName === "home") {
    homeTab.classList.remove("hidden");
    playlistTab.classList.add("hidden");
    homeTabBtn.classList.add("active-tab");
    playlistTabBtn.classList.remove("active-tab");
  } else {
    playlistTab.classList.remove("hidden");
    homeTab.classList.add("hidden");
    playlistTabBtn.classList.add("active-tab");
    homeTabBtn.classList.remove("active-tab");
    loadPlaylists();
  }
}

async function loadGames() {
  try {
    const res = await fetch(`${baseUrl}/games`);
    const games = await res.json();
    renderGames(games);
  } catch (err) {
    gamesList.innerHTML = `<p class="empty-text">Could not load games.</p>`;
  }
}

async function searchGames() {
  const term = searchInput.value.trim();

  if (!term) {
    showAllGames();
    return;
  }

  currentFilter = {
    type: "search",
    value: term,
    label: `Search: "${term}"`
  };

  updateFilterLabel();

  try {
    const res = await fetch(`${baseUrl}/games/search?name=${encodeURIComponent(term)}`);
    const games = await res.json();
    renderGames(games);
  } catch (err) {
    gamesList.innerHTML = `<p class="empty-text">Search failed.</p>`;
  }
}

async function showGamesByDeveloper(devId, devName) {
  currentFilter = {
    type: "developer",
    value: devId,
    label: `Developer: ${devName}`
  };

  updateFilterLabel();
  showTab("home");

  try {
    const res = await fetch(`${baseUrl}/games/by-developer/${devId}`);
    const games = await res.json();
    renderGames(games);
  } catch (err) {
    gamesList.innerHTML = `<p class="empty-text">Could not load games by developer.</p>`;
  }
}

async function showGamesByPublisher(pubId, pubName) {
  currentFilter = {
    type: "publisher",
    value: pubId,
    label: `Publisher: ${pubName}`
  };

  updateFilterLabel();
  showTab("home");

  try {
    const res = await fetch(`${baseUrl}/games/by-publisher/${pubId}`);
    const games = await res.json();
    renderGames(games);
  } catch (err) {
    gamesList.innerHTML = `<p class="empty-text">Could not load games by publisher.</p>`;
  }
}

function updateFilterLabel() {
  filterLabel.textContent = currentFilter ? currentFilter.label : "No filter selected";
}

function clearFilter() {
  currentFilter = null;
  searchInput.value = "";
  updateFilterLabel();
  loadGames();
}

function showAllGames() {
  currentFilter = null;
  updateFilterLabel();
  loadGames();
}

function renderGames(games) {
  if (!games || games.length === 0) {
    gamesList.innerHTML = `<p class="empty-text">No games found.</p>`;
    return;
  }

  gamesList.innerHTML = "";

  games.forEach((game) => {
    const div = document.createElement("div");
    div.className = "game-card";

    const devText = game.dev_name
      ? `<span class="meta-link" onclick="showGamesByDeveloper(${game.dev_id}, '${escapeQuotes(game.dev_name)}')">${game.dev_name}</span>`
      : "Unknown";

    const pubText = game.pub_name
      ? `<span class="meta-link" onclick="showGamesByPublisher(${game.pub_id}, '${escapeQuotes(game.pub_name)}')">${game.pub_name}</span>`
      : "Unknown";

    const cover = game.cover || "https://via.placeholder.com/300x400?text=No+Cover";

    div.innerHTML = `
      <div class="game-info">
        <h3>${game.name}</h3>
        <p><strong>Genre:</strong> ${game.genre}</p>
        <p><strong>Price:</strong> $${game.price}</p>
        <p><strong>Players:</strong> ${game.player_amount}</p>
        <p><strong>Reviews:</strong> ${game.reviews}</p>
        <p><strong>Developer:</strong> ${devText}</p>
        <p><strong>Publisher:</strong> ${pubText}</p>
        <p>${game.description}</p>
        <button onclick="addToPlaylist(${game.game_id})">Add to Playlist</button>
      </div>

      <img class="game-cover" src="${cover}" alt="${escapeQuotes(game.name)} cover">
    `;

    gamesList.appendChild(div);
  });
}

async function loadPlaylists() {
  try {
    const res = await fetch(`${baseUrl}/users/${currentUserId}/playlists`);
    const playlists = await res.json();

    if (!playlists || playlists.length === 0) {
      playlistSelect.innerHTML = "";
      activePlaylistTitle.textContent = "No playlist selected";
      playlistList.innerHTML = `<p class="empty-text">No playlists yet. Create one.</p>`;
      activePlaylistId = null;
      localStorage.removeItem("activePlaylistId");
      return;
    }

    playlistSelect.innerHTML = "";

    playlists.forEach((playlist) => {
      const option = document.createElement("option");
      option.value = playlist.list_id;
      option.textContent = playlist.listname || playlist.list_name || playlist.list_id;
      playlistSelect.appendChild(option);
    });

    const playlistExists = playlists.some(
      (playlist) => String(playlist.list_id) === String(activePlaylistId)
    );

    if (!activePlaylistId || !playlistExists) {
      activePlaylistId = playlists[0].list_id;
      localStorage.setItem("activePlaylistId", activePlaylistId);
    }

    playlistSelect.value = activePlaylistId;

    const selectedPlaylist = playlists.find(
      (playlist) => String(playlist.list_id) === String(activePlaylistId)
    );

    activePlaylistTitle.textContent = selectedPlaylist
      ? selectedPlaylist.listname || selectedPlaylist.list_name || "Selected Playlist"
      : "Selected Playlist";

    loadPlaylistGames();
  } catch (err) {
    playlistList.innerHTML = `<p class="empty-text">Could not load playlists.</p>`;
  }
}

async function loadPlaylistGames() {
  if (!activePlaylistId) {
    playlistList.innerHTML = `<p class="empty-text">No playlist selected.</p>`;
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlists/${activePlaylistId}/games?userId=${currentUserId}`);
    const games = await res.json();
    renderPlaylist(games);
  } catch (err) {
    playlistList.innerHTML = `<p class="empty-text">Could not load playlist.</p>`;
  }
}

function renderPlaylist(games) {
  if (!games || games.length === 0) {
    playlistList.innerHTML = `<p class="empty-text">No games in this playlist.</p>`;
    return;
  }

  playlistList.innerHTML = "";

  games.forEach((game) => {
    const div = document.createElement("div");
    div.className = "game-card";

    const cover = game.cover || "https://via.placeholder.com/300x400?text=No+Cover";

    div.innerHTML = `
      <div class="game-info">
        <h3>${game.name}</h3>
        <p><strong>Genre:</strong> ${game.genre}</p>
        <p><strong>Price:</strong> $${game.price}</p>
        <button onclick="removeFromPlaylist(${game.game_id})">Remove</button>
      </div>

      <img class="game-cover small-cover" src="${cover}" alt="${escapeQuotes(game.name)} cover">
    `;

    playlistList.appendChild(div);
  });
}

async function createPlaylist() {
  const listName = newPlaylistName.value.trim();

  if (!listName) {
    alert("Enter a playlist name");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUserId,
        listName: listName
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not create playlist");
      return;
    }

    newPlaylistName.value = "";
    activePlaylistId = data.playlist.list_id;
    localStorage.setItem("activePlaylistId", activePlaylistId);
    await loadPlaylists();
    showMessage("Playlist created ✔");
  } catch (err) {
    alert("Create playlist failed");
  }
}

async function deletePlaylist() {
  if (!activePlaylistId) {
    alert("No playlist selected");
    return;
  }

  if (!confirm("Delete this playlist?")) return;

  try {
    const res = await fetch(`${baseUrl}/playlists/${activePlaylistId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUserId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not delete playlist");
      return;
    }

    activePlaylistId = null;
    localStorage.removeItem("activePlaylistId");
    await loadPlaylists();
    showMessage("Playlist deleted ✔");
  } catch (err) {
    alert("Delete playlist failed");
  }
}

function changePlaylist() {
  activePlaylistId = playlistSelect.value;
  localStorage.setItem("activePlaylistId", activePlaylistId);

  const selectedText = playlistSelect.options[playlistSelect.selectedIndex]?.text || "Selected Playlist";
  activePlaylistTitle.textContent = selectedText;

  loadPlaylistGames();
}

async function addToPlaylist(gameId) {
  if (!currentUserId) {
    alert("Login first");
    return;
  }

  if (!activePlaylistId) {
    alert("Create or select a playlist first");
    showTab("playlists");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlist/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUserId,
        playlistId: activePlaylistId,
        gameId: gameId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "Could not add game");
      return;
    }

    loadPlaylistGames();
    showMessage("Game added to playlist ✔");
  } catch (err) {
    showMessage("Add failed");
  }
}

async function removeFromPlaylist(gameId) {
  if (!currentUserId || !activePlaylistId) {
    alert("Select a playlist first");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlist/remove`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUserId,
        playlistId: activePlaylistId,
        gameId: gameId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "Could not remove game");
      return;
    }

    loadPlaylistGames();
    showMessage("Game removed ✔");
  } catch (err) {
    showMessage("Remove failed");
  }
}

function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("activePlaylistId");
  window.location.href = "login.html";
}

function escapeQuotes(text) {
  return String(text).replace(/'/g, "\\'");
}

loadGames();
loadPlaylists();
updateFilterLabel();