# Poker Results React App

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the development server:

```bash
npm run dev
```

## Supabase schema

Use the following tables:

```sql
CREATE TABLE players (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE matches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_1_id BIGINT REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  player_2_id BIGINT REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  player_1_score INT DEFAULT 0 NOT NULL,
  player_2_score INT DEFAULT 0 NOT NULL,
  winner_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);
```

Create a view in Supabase for leaderboard stats:

```sql
CREATE VIEW player_summary AS
SELECT
  p.id,
  p.name,
  COUNT(m.id) AS total_games_played,
  COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) AS total_wins
FROM players p
LEFT JOIN matches m ON p.id = m.player_1_id OR p.id = m.player_2_id
GROUP BY p.id, p.name;
```

Use this view to fetch the leaderboard in the app.

## Notes

- Add players manually in Supabase or via an admin interface before adding matches.
- The app shows the leaderboard, recent matches, and a form to add new scores.
