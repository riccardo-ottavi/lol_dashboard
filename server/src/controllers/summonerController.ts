import { Request, Response } from 'express';
import pool from '../db';
import {
  getSummonerByName,
  getRankBySummonerId,
  getMatchIds,
  getMatchDetail,
  syncSummoner,
} from '../services/riotService';

export const linkSummoner = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const { summoner_name, region } = req.body;

  if (!summoner_name || !region) {
    res.status(400).json({ error: 'summoner_name e region sono obbligatori' });
    return;
  }

  try {
    const riotData = await getSummonerByName(summoner_name, region);

    const rankData = await getRankBySummonerId(riotData.id, region);

    await pool.execute(
      `INSERT INTO summoners (id, user_id, summoner_name, summoner_riot_id, puuid, region, tier, rank_division, lp)
    VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
     summoner_name = VALUES(summoner_name),
     tier = VALUES(tier),
     rank_division = VALUES(rank_division),
     lp = VALUES(lp)`,
      [
        userId,
        `${riotData.gameName}#${riotData.tagLine}`,
        riotData.id,
        riotData.puuid,
        region,
        rankData?.tier || null,
        rankData?.rank || null,
        rankData?.leaguePoints || 0,
      ]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM summoners WHERE puuid = ?',
      [riotData.puuid]
    );
    const summoner = (rows as any[])[0];

    await pool.execute(
      `INSERT INTO cache_meta (summoner_id, last_fetched_at)
       VALUES (?, NOW())
       ON DUPLICATE KEY UPDATE last_fetched_at = NOW()`,
      [summoner.id]
    );

    res.json(summoner);
  } catch (err: any) {
    console.error('Status:', err?.response?.status);
    console.error('Data:', JSON.stringify(err?.response?.data));
    console.error('Message:', err?.message);
    if (err?.message?.includes('Invalid platform region')) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err?.response?.status === 403) {
      res.status(403).json({ error: 'Accesso negato da Riot: verifica la chiave API e i permessi' });
      return;
    }
    if (err?.response?.status === 404) {
      res.status(404).json({ error: 'Summoner non trovato su Riot' });
      return;
    }
    res.status(500).json({ error: 'Errore nel collegamento account Riot' });
  }
};

export const getMySummoner = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;

  const [rows] = await pool.execute(
    'SELECT * FROM summoners WHERE user_id = ?',
    [userId]
  );
  const summoners = rows as any[];

  if (!summoners.length) {
    res.status(404).json({ error: 'Nessun summoner collegato' });
    return;
  }

  syncSummoner(summoners[0].id).catch(console.error);

  res.json(summoners[0]);
};

export const getSummonerMatches = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const regionalRoute = process.env.RIOT_REGIONAL || 'europe';

  const [rows] = await pool.execute(
    'SELECT * FROM summoners WHERE id = ?',
    [id]
  );
  const summoner = (rows as any[])[0];

  if (!summoner) {
    res.status(404).json({ error: 'Summoner non trovato' });
    return;
  }

  try {
    const matchIds = await getMatchIds(summoner.puuid, regionalRoute);
    const matches = await Promise.all(
      matchIds.map((matchId: string) => getMatchDetail(matchId, regionalRoute))
    );
    res.json(matches);
  } catch (err: any) {
    console.error('Errore fetch matches:', err?.response?.data || err?.message);
    res.status(500).json({ error: 'Errore nel recupero dei match' });
  }
};