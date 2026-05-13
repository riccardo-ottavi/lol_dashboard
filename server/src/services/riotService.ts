import axios from 'axios';
import pool from '../db';
import { RowDataPacket } from 'mysql2';

const CACHE_TTL_MS = 5 * 60 * 1000;

// =====================
// PLATFORM ROUTES (LOL classic APIs)
// =====================
const PLATFORM_ROUTES: Record<string, string> = {
  euw: 'euw1',
  euw1: 'euw1',
  na: 'na1',
  na1: 'na1',
  eun: 'eun1',
  eun1: 'eun1',
  kr: 'kr',
  br: 'br1',
  jp: 'jp1',
  oce: 'oc1',
  lan: 'la1',
  las: 'la2',
  tr: 'tr1',
  ru: 'ru',
  pbe: 'pbe',
};

// =====================
// REGIONAL ROUTES (MATCH + ACCOUNT V1)
// =====================
const normalizeRegionalRoute = (region: string): string => {
  const r = region.trim().toLowerCase();

  const map: Record<string, string> = {
    europe: 'europe',
    euw: 'europe',
    euw1: 'europe',
    eun1: 'europe',

    na: 'americas',
    na1: 'americas',
    br1: 'americas',
    la1: 'americas',
    la2: 'americas',

    jp1: 'asia',
    kr: 'asia',

    oce: 'sea',
    sea: 'sea',

    tr1: 'europe',
    ru: 'europe',
  };

  return map[r] || 'europe';
};

// =====================
// RIOT CLIENT FACTORY
// =====================
const riotClient = (baseURL: string) => {
  const apiKey = process.env.RIOT_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Missing RIOT_API_KEY environment variable');
  }

  return axios.create({
    baseURL,
    headers: {
      'X-Riot-Token': apiKey,
    },
  });
};

// =====================
// PLATFORM ROUTE
// =====================
const getPlatformRoute = (region: string): string => {
  const normalized = region.trim().toLowerCase();

  const value = PLATFORM_ROUTES[normalized];
  if (!value) {
    throw new Error(`Invalid platform region: ${region}`);
  }

  return value;
};

// =====================
// CACHE
// =====================
const isCacheValid = async (summonerId: string): Promise<boolean> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT last_fetched_at FROM cache_meta WHERE summoner_id = ?',
    [summonerId]
  );

  if (!rows.length) return false;

  const lastFetch = new Date(rows[0].last_fetched_at).getTime();
  return Date.now() - lastFetch < CACHE_TTL_MS;
};

const updateCache = async (summonerId: string): Promise<void> => {
  await pool.execute(
    `INSERT INTO cache_meta (summoner_id, last_fetched_at)
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE last_fetched_at = NOW()`,
    [summonerId]
  );
};

// =====================
// SUMMONER BY NAME / RIOT ID
// =====================
export const getSummonerByName = async (riotId: string, region: string) => {
  const platformRoute = getPlatformRoute(region);
  const summonerClient = riotClient(`https://${platformRoute}.api.riotgames.com`);

  const regionalRoute = normalizeRegionalRoute(region);

  if (riotId.includes('#')) {
    const [gameName, tagLine] = riotId.split('#');

    if (!gameName || !tagLine) {
      throw new Error('Formato non valido: usa Nome#TAG');
    }

    const accountClient = riotClient(
      `https://${regionalRoute}.api.riotgames.com`
    );

    const { data: accountData } = await accountClient.get(
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    const { data: summonerData } = await summonerClient.get(
      `/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`
    );

    return {
      ...summonerData,
      puuid: accountData.puuid,
      gameName,
      tagLine,
    };
  }

  const { data: summonerData } = await summonerClient.get(
    `/lol/summoner/v4/summoners/by-name/${encodeURIComponent(riotId)}`
  );

  return {
    ...summonerData,
    puuid: summonerData.puuid,
    gameName: summonerData.name,
    tagLine: '',
  };
};

// =====================
// RANK
// =====================
export const getRankBySummonerId = async (
  summonerRiotId: string,
  region: string
) => {
  const platformRoute = getPlatformRoute(region);

  const client = riotClient(
    `https://${platformRoute}.api.riotgames.com`
  );

  const { data } = await client.get(
    `/lol/league/v4/entries/by-summoner/${summonerRiotId}`
  );

  return (data as any[]).find(
    (e) => e.queueType === 'RANKED_SOLO_5x5'
  ) || null;
};

// =====================
// MATCH IDS
// =====================
export const getMatchIds = async (
  puuid: string,
  regionalRoute: string,
  count = 10
): Promise<string[]> => {
  const client = riotClient(
    `https://${normalizeRegionalRoute(regionalRoute)}.api.riotgames.com`
  );

  const { data } = await client.get(
    `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
  );

  return data;
};

// =====================
// MATCH DETAIL
// =====================
export const getMatchDetail = async (
  matchId: string,
  regionalRoute: string
) => {
  const client = riotClient(
    `https://${normalizeRegionalRoute(regionalRoute)}.api.riotgames.com`
  );

  const { data } = await client.get(
    `/lol/match/v5/matches/${matchId}`
  );

  return data;
};

// =====================
// SYNC SUMMONER
// =====================
export const syncSummoner = async (summonerId: string): Promise<void> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM summoners WHERE id = ?',
    [summonerId]
  );

  const summoner = rows[0];
  if (!summoner) throw new Error('Summoner non trovato nel DB');

  const valid = await isCacheValid(summonerId);
  if (valid) return;

  try {
    const rankData = await getRankBySummonerId(
      summoner.summoner_riot_id,
      summoner.region
    );

    if (rankData) {
      await pool.execute(
        'UPDATE summoners SET tier = ?, rank_division = ?, lp = ? WHERE id = ?',
        [
          rankData.tier,
          rankData.rank,
          rankData.leaguePoints,
          summonerId,
        ]
      );
    }

    await updateCache(summonerId);
  } catch (err) {
    console.error('Errore sync summoner:', err);
    throw err;
  }
};