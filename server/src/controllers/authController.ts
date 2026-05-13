import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../db';

const DISCORD_API = 'https://discord.com/api';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const SCOPES = ['identify'].join(' ');

export const discordRedirect = (_req: Request, res: Response): void => {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
    });

    res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
};

export const discordCallback = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'Codice OAuth mancante' });
        return;
    }

    try {
        const tokenRes = await axios.post(
            `${DISCORD_API}/oauth2/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenRes.data;

        const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id: discord_id, username, avatar: avatarHash } = userRes.data;
        const avatar = avatarHash
            ? `https://cdn.discordapp.com/avatars/${discord_id}/${avatarHash}.png`
            : null;

        await pool.execute(
            `INSERT INTO users (id, discord_id, username, avatar)
       VALUES (UUID(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username), avatar = VALUES(avatar)`,
            [discord_id, username, avatar]
        );

        const [rows] = await pool.execute(
            'SELECT id, discord_id, username, avatar FROM users WHERE discord_id = ?',
            [discord_id]
        );
        const user = (rows as any[])[0];

        const token = jwt.sign(
            { id: user.id, discord_id: user.discord_id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);

    } catch (err: any) {
        console.error('OAuth error:', err?.response?.data || err?.message || err);
        res.status(500).json({ error: 'Autenticazione fallita' });
    }
};


export const getMe = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;

    const [rows] = await pool.execute(
        'SELECT id, discord_id, username, avatar, created_at FROM users WHERE id = ?',
        [userId]
    );

    const user = (rows as any[])[0];

    if (!user) {
        res.status(404).json({ error: 'Utente non trovato' });
        return;
    }

    res.json(user);
};