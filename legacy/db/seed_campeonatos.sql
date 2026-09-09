INSERT INTO campeonatos (id, nome, logo_url) VALUES 
(71, 'Brasileirão Série A', 'https://media.api-sports.io/football/leagues/71.png'),
(72, 'Brasileirão Série B', 'https://media.api-sports.io/football/leagues/72.png'),
(73, 'Copa do Brasil', 'https://media.api-sports.io/football/leagues/73.png'),
(13, 'CONMEBOL Libertadores', 'https://media.api-sports.io/football/leagues/13.png'),
(11, 'CONMEBOL Sul-Americana', 'https://media.api-sports.io/football/leagues/11.png'),
(2, 'UEFA Champions League', 'https://media.api-sports.io/football/leagues/2.png'),
(39, 'Premier League', 'https://media.api-sports.io/football/leagues/39.png'),
(140, 'La Liga', 'https://media.api-sports.io/football/leagues/140.png'),
(135, 'Serie A Italiana', 'https://media.api-sports.io/football/leagues/135.png'),
(78, 'Bundesliga Alemã', 'https://media.api-sports.io/football/leagues/78.png'),
(61, 'Ligue 1 Francesa', 'https://media.api-sports.io/football/leagues/61.png')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, logo_url = EXCLUDED.logo_url;
