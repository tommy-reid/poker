import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

type PlayerSummary = {
  id: number;
  name: string;
  total_games_played: number;
  total_wins: number;
};

type MatchRow = {
  id: number;
  player_1_id: number;
  player_2_id: number;
  player_1_score: number;
  player_2_score: number;
  winner_id: number | null;
  played_at: string;
  player_1_name: string;
  player_2_name: string;
};

function App() {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player1Id, setPlayer1Id] = useState<number | ''>('');
  const [player2Id, setPlayer2Id] = useState<number | ''>('');
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);
  const [newPlayerName, setNewPlayerName] = useState('');

  const playerOptions = useMemo(
    () => players.map((player) => ({ value: player.id, label: player.name })),
    [players]
  );

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const [playersResult, matchRowsResult, recentMatchesResult] = await Promise.all([
      supabase.from('players').select('id, name'),
      supabase.from('matches').select('player_1_id, player_2_id, winner_id'),
      supabase
        .from('matches')
        .select(`id, player_1_id, player_2_id, player_1_score, player_2_score, winner_id, played_at, player_1:player_1_id(name), player_2:player_2_id(name)`)
        .order('played_at', { ascending: false })
        .limit(20),
    ]);

    if (playersResult.error || matchRowsResult.error || recentMatchesResult.error) {
      setError(
        playersResult.error?.message || matchRowsResult.error?.message || recentMatchesResult.error?.message || 'Failed to load data'
      );
      setLoading(false);
      return;
    }

    const playersData = playersResult.data ?? [];
    const matchRows = matchRowsResult.data ?? [];

    const statsMap = new Map<number, PlayerSummary>();
    playersData.forEach((player) => {
      statsMap.set(player.id, {
        id: player.id,
        name: player.name,
        total_games_played: 0,
        total_wins: 0,
      });
    });

    matchRows.forEach((match: any) => {
      const player1 = statsMap.get(match.player_1_id);
      const player2 = statsMap.get(match.player_2_id);
      if (player1) {
        player1.total_games_played += 1;
      }
      if (player2) {
        player2.total_games_played += 1;
      }
      if (match.winner_id) {
        const winner = statsMap.get(match.winner_id);
        if (winner) {
          winner.total_wins += 1;
        }
      }
    });

    setPlayers(Array.from(statsMap.values()).sort((a, b) => b.total_wins - a.total_wins));

    setMatches(
      (recentMatchesResult.data ?? []).map((row: any) => ({
        id: row.id,
        player_1_id: row.player_1_id,
        player_2_id: row.player_2_id,
        player_1_score: row.player_1_score,
        player_2_score: row.player_2_score,
        winner_id: row.winner_id,
        played_at: row.played_at,
        player_1_name: row.player_1?.name ?? 'Unknown',
        player_2_name: row.player_2?.name ?? 'Unknown',
      }))
    );

    setLoading(false);
  };

  const createMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!player1Id || !player2Id) {
      setError('Select both players.');
      return;
    }
    if (player1Id === player2Id) {
      setError('Choose two different players.');
      return;
    }

    const winnerId = player1Score === player2Score ? null : player1Score > player2Score ? player1Id : player2Id;

    const { error: insertError } = await supabase.from('matches').insert([
      {
        player_1_id: player1Id,
        player_2_id: player2Id,
        player_1_score: player1Score,
        player_2_score: player2Score,
        winner_id: winnerId,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setPlayer1Id('');
    setPlayer2Id('');
    setPlayer1Score(0);
    setPlayer2Score(0);
    await fetchData();
  };

  const createPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!newPlayerName.trim()) {
      setError('Enter a player name.');
      return;
    }

    const { error: insertError } = await supabase.from('players').insert([
      { name: newPlayerName.trim() },
    ]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewPlayerName('');
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="app-shell">
      <header>
        <h1>Pool Game Results</h1>
      </header>
      <main>
        <section className="panel">
          <h2>Player Leaderboard</h2>
          {loading ? (
            <p>Loading player stats…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Games</th>
                  <th>Wins</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td>{player.name}</td>
                    <td>{player.total_games_played}</td>
                    <td>{player.total_wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2>Recent Matches</h2>
          {loading ? (
            <p>Loading recent results…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Player 1</th>
                  <th>Score</th>
                  <th>Player 2</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td>{new Date(match.played_at).toLocaleString()}</td>
                    <td>{match.player_1_name}</td>
                    <td>
                      {match.player_1_score} - {match.player_2_score}
                    </td>
                    <td>{match.player_2_name}</td>
                    <td>{match.winner_id ? (match.winner_id === match.player_1_id ? match.player_1_name : match.player_2_name) : 'Tie'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel form-panel">
          <h2>Add Player</h2>
          <form onSubmit={createPlayer}>
            <label>
              Player name
              <input
                type="text"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="Enter player name"
              />
            </label>
            <button type="submit">Add Player</button>
          </form>
        </section>

        <section className="panel form-panel">
          <h2>Add a Match</h2>
          <form onSubmit={createMatch}>
            <label>
              Player 1
              <select value={player1Id} onChange={(event) => setPlayer1Id(Number(event.target.value) || '')}>
                <option value="">Select player</option>
                {playerOptions.map((player) => (
                  <option key={player.value} value={player.value}>
                    {player.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Score
              <input type="number" min="0" value={player1Score} onChange={(event) => setPlayer1Score(Number(event.target.value))} />
            </label>
            <label>
              Player 2
              <select value={player2Id} onChange={(event) => setPlayer2Id(Number(event.target.value) || '')}>
                <option value="">Select player</option>
                {playerOptions.map((player) => (
                  <option key={player.value} value={player.value}>
                    {player.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Score
              <input type="number" min="0" value={player2Score} onChange={(event) => setPlayer2Score(Number(event.target.value))} />
            </label>
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Save Match</button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
