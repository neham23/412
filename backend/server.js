const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "jonps",
  password: "1234",
  port: 5432
});

function gameQuery(baseWhere = "", params = []) {
  return {
    text: `
      SELECT
        g.game_id,
        g.reviews,
        g.description,
        g.price,
        g.player_amount,
        g.genre,
        g.name,
        g.cover,
        d.dev_id,
        d.dev_name,
        p.pub_id,
        p.pub_name
      FROM game g
      LEFT JOIN makes m ON g.game_id = m.game_id
      LEFT JOIN developer d ON m.dev_id = d.dev_id
      LEFT JOIN released r ON g.game_id = r.game_id
      LEFT JOIN publisher p ON r.pub_id = p.pub_id
      ${baseWhere}
      ORDER BY g.game_id
    `,
    values: params
  };
}

app.get("/games", async (req, res) => {
  try {
    const result = await pool.query(gameQuery());
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/games/search", async (req, res) => {
  try {
    const name = req.query.name || "";
    const result = await pool.query(
      gameQuery("WHERE LOWER(g.name) LIKE LOWER($1)", [`%${name}%`])
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/games/by-developer/:devId", async (req, res) => {
  try {
    const devId = req.params.devId;
    const result = await pool.query(
      gameQuery("WHERE d.dev_id = $1", [devId])
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/games/by-publisher/:pubId", async (req, res) => {
  try {
    const pubId = req.params.pubId;
    const result = await pool.query(
      gameQuery("WHERE p.pub_id = $1", [pubId])
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/:userId/playlists", async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await pool.query(
      `
      SELECT p.list_id, p.listname
      FROM playlist p
      JOIN creates c ON p.list_id = c.list_id
      WHERE c.user_id = $1
      ORDER BY p.list_id
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/playlists", async (req, res) => {
  try {
    const { userId, listName } = req.body;

    if (!userId || !listName) {
      return res.status(400).json({ error: "Missing userId or listName" });
    }

    const nextIdResult = await pool.query(
      "SELECT COALESCE(MAX(list_id), 0) + 1 AS next_id FROM playlist"
    );

    const nextId = nextIdResult.rows[0].next_id;

    await pool.query(
      "INSERT INTO playlist (list_id, listname, owner) VALUES ($1, $2, $3)",
      [nextId, listName, String(userId)]
    );

    await pool.query(
      "INSERT INTO creates (user_id, list_id) VALUES ($1, $2)",
      [userId, nextId]
    );

    res.json({
      message: "Playlist created",
      playlist: {
        list_id: nextId,
        listname: listName
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/playlists/:playlistId", async (req, res) => {
  try {
    const playlistId = req.params.playlistId;
    const { userId } = req.body;

    const ownership = await pool.query(
      "SELECT * FROM creates WHERE user_id = $1 AND list_id = $2",
      [userId, playlistId]
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: "Playlist does not belong to this user" });
    }

    await pool.query("DELETE FROM added_to WHERE list_id = $1", [playlistId]);
    await pool.query("DELETE FROM creates WHERE list_id = $1", [playlistId]);
    await pool.query("DELETE FROM playlist WHERE list_id = $1", [playlistId]);

    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/playlists/:playlistId/games", async (req, res) => {
  try {
    const playlistId = req.params.playlistId;
    const userId = req.query.userId;

    const ownership = await pool.query(
      "SELECT * FROM creates WHERE user_id = $1 AND list_id = $2",
      [userId, playlistId]
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: "Playlist does not belong to this user" });
    }

    const gamesResult = await pool.query(
      `
      SELECT g.*
      FROM game g
      JOIN added_to a ON g.game_id = a.game_id
      WHERE a.list_id = $1
      ORDER BY g.game_id
      `,
      [playlistId]
    );

    res.json(gamesResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/playlist/add", async (req, res) => {
  try {
    const { userId, playlistId, gameId } = req.body;

    const ownership = await pool.query(
      "SELECT * FROM creates WHERE user_id = $1 AND list_id = $2",
      [userId, playlistId]
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: "Playlist does not belong to this user" });
    }

    await pool.query(
      "INSERT INTO added_to (game_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [gameId, playlistId]
    );

    res.json({ message: "Game added to playlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/playlist/remove", async (req, res) => {
  try {
    const { userId, playlistId, gameId } = req.body;

    const ownership = await pool.query(
      "SELECT * FROM creates WHERE user_id = $1 AND list_id = $2",
      [userId, playlistId]
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: "Playlist does not belong to this user" });
    }

    await pool.query(
      "DELETE FROM added_to WHERE game_id = $1 AND list_id = $2",
      [gameId, playlistId]
    );

    res.json({ message: "Game removed from playlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});