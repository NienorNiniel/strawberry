import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows: sources } = await pool.query('SELECT id, "feedUrl", name FROM "Source"');
for (const s of sources) {
  const domain = new URL(s.feedUrl).hostname;
  const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  await pool.query('UPDATE "Source" SET "iconUrl" = $1 WHERE id = $2', [iconUrl, s.id]);
  console.log('Updated', s.name, '->', iconUrl);
}
pool.end();
