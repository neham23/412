const baseUrl = "http://localhost:3000";

let currentUserId = localStorage.getItem("userId");
let activePlaylistId = localStorage.getItem("activePlaylistId");
let currentFilter = null;

if (!currentUserId) {
  window.location.href = "login.html";
}

const searchBtn = document.getElementById("searchBtn");
const showAllBtn = document.getElementById("showAllBtn");
const logoutBtn = document.getElementById("logoutBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
const playlistSelect = document.getElementById("playlistSelect");

const homeTabBtn = document.getElementById("homeTabBtn");
const playlistTabBtn = document.getElementById("playlistTabBtn");
const homeSection = document.getElementById("homeSection");
const playlistSection = document.getElementById("playlistSection");

const searchInput = document.getElementById("searchInput");
const newPlaylistName = document.getElementById("newPlaylistName");
const currentUserText = document.getElementById("currentUser");
const gamesList = document.getElementById("gamesList");
const playlistList = document.getElementById("playlistList");
const filterLabel = document.getElementById("filterLabel");
const activePlaylistTitle = document.getElementById("activePlaylistTitle");

currentUserText.textContent = `Logged in as User ${currentUserId}`;

searchBtn.addEventListener("click", searchGames);
showAllBtn.addEventListener("click", showAllGames);
logoutBtn.addEventListener("click", logout);
clearFilterBtn.addEventListener("click", clearFilter);
createPlaylistBtn.addEventListener("click", createPlaylist);
playlistSelect.addEventListener("change", changePlaylist);
homeTabBtn.addEventListener("click", showHomeTab);
playlistTabBtn.addEventListener("click", showPlaylistTab);

if (deletePlaylistBtn) {
  deletePlaylistBtn.addEventListener("click", deletePlaylist);
}

function showHomeTab() {
  homeSection.classList.remove("hidden");
  playlistSection.classList.add("hidden");
}

function showPlaylistTab() {
  playlistSection.classList.remove("hidden");
  homeSection.classList.add("hidden");
  loadPlaylists();
}

async function loadGames() {
  try {
    const res = await fetch(`${baseUrl}/games`);
    const games = await res.json();

    if (!res.ok) {
      gamesList.innerHTML = `<p class="empty-text">${games.error || "Could not load games."}</p>`;
      return;
    }

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

    const coverImg = game.cover
      ? `<img class="game-cover" src="${game.cover}" alt="${game.name} cover" onerror="this.src='https://via.placeholder.com/300x220?text=No+Image';" />`
      : `<img class="game-cover" src="https://via.placeholder.com/300x220?text=No+Image" alt="No cover" />`;

    const releaseDate = getReleaseField(game, ["released_date", "release_date", "releaseddate", "released"]);
    const releasedOn = getReleaseField(game, ["released_on", "release_on", "platform", "releasedon"]);
    const languages = getReleaseField(game, ["released_languages", "release_languages", "languages", "language"]);

    div.innerHTML = `
      <div class="game-info">
        <h3>${game.name}</h3>

        <div class="game-meta-grid">
          <p><strong>Genre:</strong> ${game.genre || "N/A"}</p>
          <p><strong>Price:</strong> $${game.price || "N/A"}</p>
          <p><strong>Players:</strong> ${game.player_amount || "N/A"}</p>
          <p><strong>Reviews:</strong> ${game.reviews || "N/A"}</p>
          <p><strong>Release Date:</strong> ${formatDate(releaseDate)}</p>
          <p><strong>Released On:</strong> ${releasedOn}</p>
          <p><strong>Languages:</strong> ${languages}</p>
          <p><strong>Developer:</strong> ${devText}</p>
          <p><strong>Publisher:</strong> ${pubText}</p>
        </div>

        <p class="game-description">${game.description || ""}</p>
        <button onclick="addToPlaylist(${game.game_id})">Add to Playlist</button>
      </div>
      ${coverImg}
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
      option.textContent = playlist.listname || playlist.list_id;
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

    activePlaylistTitle.textContent = selectedPlaylist ? selectedPlaylist.listname : "Selected Playlist";
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

    div.innerHTML = `
      <div class="game-info">
        <h3>${game.name}</h3>
        <p><strong>Genre:</strong> ${game.genre || "N/A"}</p>
        <p><strong>Price:</strong> $${game.price || "N/A"}</p>
        <button onclick="removeFromPlaylist(${game.game_id})">Remove</button>
      </div>
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, listName })
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
  } catch (err) {
    alert("Create playlist failed");
  }
}

async function deletePlaylist() {
  if (!activePlaylistId) {
    alert("Select a playlist first");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlists/${activePlaylistId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not delete playlist");
      return;
    }

    localStorage.removeItem("activePlaylistId");
    activePlaylistId = null;
    await loadPlaylists();
  } catch (err) {
    alert("Delete playlist failed");
  }
}

function changePlaylist() {
  activePlaylistId = playlistSelect.value;
  localStorage.setItem("activePlaylistId", activePlaylistId);
  activePlaylistTitle.textContent = playlistSelect.options[playlistSelect.selectedIndex].text;
  loadPlaylistGames();
}

async function addToPlaylist(gameId) {
  if (!activePlaylistId) {
    alert("Create or select a playlist first");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/playlist/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        playlistId: activePlaylistId,
        gameId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not add game");
      return;
    }

    alert("Game added to playlist");
  } catch (err) {
    alert("Add failed");
  }
}

async function removeFromPlaylist(gameId) {
  try {
    const res = await fetch(`${baseUrl}/playlist/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        playlistId: activePlaylistId,
        gameId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not remove game");
      return;
    }

    loadPlaylistGames();
  } catch (err) {
    alert("Remove failed");
  }
}

function getReleaseField(game, possibleNames) {
  if (!game.release_info) return "N/A";
  for (const name of possibleNames) {
    if (game.release_info[name]) return game.release_info[name];
  }
  return "N/A";
}

function formatDate(dateValue) {
  if (!dateValue || dateValue === "N/A") return "N/A";
  const date = new Date(dateValue);
  return isNaN(date) ? dateValue : date.toLocaleDateString();
}

function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("activePlaylistId");
  window.location.href = "login.html";
}

function escapeQuotes(text) {
  return String(text).replace(/'/g, "\\'");
}

showHomeTab();
loadGames();
loadPlaylists();
updateFilterLabel();
