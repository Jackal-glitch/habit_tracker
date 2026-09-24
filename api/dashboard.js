const { getPool } = require('./_db');

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(checkDatesSet) {
  if (!checkDatesSet || checkDatesSet.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  // Si aujourd'hui n'est pas coché, on part d'hier (le streak peut être "en cours" ou "jusqu'à hier").
  if (!checkDatesSet.has(toISODate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (checkDatesSet.has(toISODate(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

module.exports = async (req, res) => {
  const pool = getPool();

  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || now.getUTCMonth() + 1; // 1-12
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const numWeeks = Math.ceil(daysInMonth / 7);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { rows: habits } = await pool.query(
      'SELECT * FROM habits ORDER BY position ASC, id ASC'
    );

    const { rows: monthChecks } = await pool.query(
      `SELECT habit_id, check_date FROM habit_checks
       WHERE check_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    const { rows: allChecks } = await pool.query(
      'SELECT habit_id, check_date FROM habit_checks ORDER BY check_date DESC'
    );

    // Regrouper les checks du mois par habitude -> Set de jours (1..31)
    const monthDaysByHabit = {};
    monthChecks.forEach((r) => {
      const day = new Date(r.check_date).getUTCDate();
      if (!monthDaysByHabit[r.habit_id]) monthDaysByHabit[r.habit_id] = new Set();
      monthDaysByHabit[r.habit_id].add(day);
    });

    // Regrouper tout l'historique par habitude -> Set de dates ISO (pour le calcul du streak)
    const allDatesByHabit = {};
    allChecks.forEach((r) => {
      const iso =
        typeof r.check_date === 'string' ? r.check_date : toISODate(new Date(r.check_date));
      if (!allDatesByHabit[r.habit_id]) allDatesByHabit[r.habit_id] = new Set();
      allDatesByHabit[r.habit_id].add(iso);
    });

    // Découper le mois en semaines de 7 jours
    const weeks = [];
    for (let w = 0; w < numWeeks; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min(startDay + 6, daysInMonth);
      const days = [];
      for (let d = startDay; d <= endDay; d++) days.push(d);
      weeks.push({ label: `Week ${w + 1}`, days });
    }

    const habitsOut = habits.map((h) => {
      const daysChecked = monthDaysByHabit[h.id] ? Array.from(monthDaysByHabit[h.id]) : [];
      const streak = computeStreak(allDatesByHabit[h.id]);

      const weeklyBreakdown = weeks.map((week) => {
        const completed = week.days.filter((d) => daysChecked.includes(d)).length;
        const left = Math.max(h.goal - completed, 0);
        const progressPct = h.goal > 0 ? Math.round((completed / h.goal) * 100) : 0;
        return { completed, goal: h.goal, left, progressPct: Math.min(progressPct, 100) };
      });

      return {
        id: h.id,
        name: h.name,
        icon: h.icon,
        goal: h.goal,
        color: h.color,
        daysChecked,
        completedThisMonth: daysChecked.length,
        streak,
        weeklyBreakdown,
      };
    });

    // Progression quotidienne (% d'habitudes complétées ce jour-là) -> graphique en ligne
    const dailyProgress = [];
    for (let day = 1; day <= daysInMonth; day++) {
      if (habits.length === 0) {
        dailyProgress.push(0);
        continue;
      }
      const completedCount = habitsOut.filter((h) => h.daysChecked.includes(day)).length;
      dailyProgress.push(Math.round((completedCount / habits.length) * 1000) / 10);
    }

    // Totaux pour le donut "Overview Daily Progress"
    const totalGoal = habitsOut.reduce((sum, h) => sum + h.goal * numWeeks, 0);
    const totalCompleted = habitsOut.reduce((sum, h) => sum + h.completedThisMonth, 0);
    const totalLeft = Math.max(totalGoal - totalCompleted, 0);
    const completedPct = totalGoal > 0 ? Math.round((totalCompleted / totalGoal) * 1000) / 10 : 0;
    const leftPct = Math.round((100 - completedPct) * 10) / 10;

    // Récapitulatif par semaine (toutes habitudes confondues) -> tableau "Overview"
    const weeklySummary = weeks.map((week, i) => {
      const completed = habitsOut.reduce((s, h) => s + h.weeklyBreakdown[i].completed, 0);
      const goal = habitsOut.reduce((s, h) => s + h.weeklyBreakdown[i].goal, 0);
      const left = Math.max(goal - completed, 0);
      const progressPct = goal > 0 ? Math.round((completed / goal) * 1000) / 10 : 0;
      return { label: week.label, days: week.days, completed, goal, left, progressPct };
    });

    // Top habitudes par streak, pour la barre latérale
    const topHabits = [...habitsOut].sort((a, b) => b.streak - a.streak).slice(0, 10);

    res.status(200).json({
      year,
      month,
      daysInMonth,
      weeks: weeks.map((w) => ({ label: w.label, days: w.days })),
      habits: habitsOut,
      dailyProgress,
      totals: { totalGoal, totalCompleted, totalLeft, completedPct, leftPct },
      weeklySummary,
      topHabits,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};
