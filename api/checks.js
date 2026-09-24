const { getPool } = require('./_db');

module.exports = async (req, res) => {
  const pool = getPool();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const { habitId, date } = req.body || {};
    if (!habitId || !date) {
      return res.status(400).json({ error: 'habitId et date sont requis.' });
    }

    const existing = await pool.query(
      'SELECT id FROM habit_checks WHERE habit_id = $1 AND check_date = $2',
      [habitId, date]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM habit_checks WHERE id = $1', [existing.rows[0].id]);
      return res.status(200).json({ checked: false });
    }

    await pool.query(
      'INSERT INTO habit_checks (habit_id, check_date) VALUES ($1, $2)',
      [habitId, date]
    );
    return res.status(200).json({ checked: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};
