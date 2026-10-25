// Placeholder until a real live-scores provider is wired in (mirrors src/pages/Sports.jsx).
export const getMatches = async () => [
  { id: 1, sport: 'Cricket', team1: 'India', team2: 'Australia', score1: '287/5', score2: 'Yet to bat', overs: '45.2/50', status: 'LIVE', tournament: 'ICC ODI World Cup', time: null },
  { id: 2, sport: 'Football', team1: 'Manchester City', team2: 'Arsenal', score1: '2', score2: '1', overs: "73'", status: 'LIVE', tournament: 'Premier League', time: null },
  { id: 3, sport: 'Cricket', team1: 'Pakistan', team2: 'England', score1: '-', score2: '-', overs: null, status: 'UPCOMING', tournament: 'T20 World Cup', time: 'Today, 7:00 PM IST' },
  { id: 4, sport: 'Kabaddi', team1: 'Jaipur Pink Panthers', team2: 'Patna Pirates', score1: '-', score2: '-', overs: null, status: 'UPCOMING', tournament: 'Pro Kabaddi League', time: 'Today, 8:30 PM IST' },
];
