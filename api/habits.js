const { getPool } = require('./_db');

module.exports = async (req, res) => {
  const pool = getPool();

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        'SELECT * FROM habits ORDER BY position ASC, id ASC'
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, icon, goal, color } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Le nom de l\'habitude est requis.' });
      }
      const { rows: posRows } = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM habits'
      );
      const { rows } = await pool.query(
        `INSERT INTO habits (name, icon, goal, color, position)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          String(name).trim(),
          icon || '✅',
          Number.isFinite(+goal) && +goal > 0 ? +goal : 7,
          color || '#2dd4bf',
          posRows[0].next_position,
        ]
      );
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id requis.' });
      await pool.query('DELETE FROM habits WHERE id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};
