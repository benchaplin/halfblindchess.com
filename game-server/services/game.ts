import { Application, Request, Response } from "express";
import { logger } from "../logger";
import { Server, Socket } from "socket.io";
import { RedisClientType } from "redis";
import { HalfBlindChess, DEFAULT_HB_POSITION, Square } from "halfblindchess";
import { Color } from "halfblindchessground/types";
import { v4 as uuidv4 } from "uuid";
import { toColor, toDests } from "../hbcHelpers";
import {
    Game,
    GameSummary,
    StringifiableGameState,
    TimeControl,
} from "../../types/gameTypes";
import { scheduleFlagFall, clearFlagFall } from "./clock";

type Redis = RedisClientType<any, any, any>;

const DEFAULT_TIME_CONTROL: TimeControl = { base: 300_000, increment: 0 };
const MAX_BASE = 60 * 60_000; // 60 min
const MAX_INCREMENT = 60_000; // 60 s

// Rolling expiry so Redis self-cleans games. Refreshed on every write, so an
// active game never expires mid-play (clocks cap at 60 min); a finished or
// abandoned game disappears this long after its last activity — which also
// leaves a generous window to return and accept a rematch.
const GAME_TTL_SECONDS = 24 * 60 * 60; // 24 h
const USER_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 d

const gameKey = (id: string) => `game:${id}`;
const userKey = (id: string) => `user:${id}`;

// Set of non-finished game ids, so the lobby never needs redis.keys("*").
const LOBBY_SET = "lobby:games";

// Abuse limits.
const MAX_USERNAME_LEN = 20;
const MAX_ID_LEN = 64;
const MAX_OPEN_GAMES = 500; // global cap on concurrent non-finished games

// ---------------------------------------------------------------------------
// Input validation / sanitizing (all socket + REST input is untrusted)
// ---------------------------------------------------------------------------

// Ids we mint are 8 hex chars; accept a little slack but keep them key-safe
// and bounded so a client can't smuggle huge strings into keys/room names.
const isValidGameId = (id: unknown): id is string =>
    typeof id === "string" && /^[a-zA-Z0-9]{1,32}$/.test(id);

const sanitizeId = (id: unknown): string | null =>
    typeof id === "string" && id.length > 0 && id.length <= MAX_ID_LEN
        ? id
        : null;

const sanitizeUsername = (u: unknown): string | undefined =>
    typeof u === "string" ? u.trim().slice(0, MAX_USERNAME_LEN) || undefined : undefined;

const isSquare = (s: unknown): s is Square =>
    typeof s === "string" && /^[a-h][1-8]$/.test(s);

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

async function loadGame(redis: Redis, gameId: string): Promise<Game | null> {
    const str = await redis.get(gameKey(gameId));
    if (str === null) return null;
    try {
        return JSON.parse(str) as Game;
    } catch {
        return null; // never let a corrupt value crash a handler
    }
}

async function saveGame(redis: Redis, gameId: string, game: Game) {
    await redis.set(gameKey(gameId), JSON.stringify(game), {
        EX: GAME_TTL_SECONDS,
    });
}

async function upsertUser(redis: Redis, id?: string, username?: string) {
    const name = sanitizeUsername(username);
    if (!id || !name || id.length > MAX_ID_LEN) return;
    await redis.set(userKey(id), JSON.stringify({ id, username: name }), {
        EX: USER_TTL_SECONDS,
    });
}

function normalizeTimeControl(tc: any): TimeControl {
    const base = Number(tc?.base);
    const increment = Number(tc?.increment);
    return {
        base:
            Number.isFinite(base) && base > 0
                ? Math.min(base, MAX_BASE)
                : DEFAULT_TIME_CONTROL.base,
        increment:
            Number.isFinite(increment) && increment >= 0
                ? Math.min(increment, MAX_INCREMENT)
                : DEFAULT_TIME_CONTROL.increment,
    };
}

// ---------------------------------------------------------------------------
// Clock helpers (server-authoritative, timestamp-based)
// ---------------------------------------------------------------------------

// Live time remaining for each player right now, accounting for time elapsed
// on the clock of whoever is currently on move.
function liveTimes(
    game: Game,
    turn: Color
): { player1Time: number; player2Time: number } {
    let { player1Time, player2Time } = game;
    if (game.status === "active" && game.turnStartedAt != null) {
        const elapsed = Date.now() - game.turnStartedAt;
        if (turn === "white") {
            player1Time = Math.max(0, player1Time - elapsed);
        } else {
            player2Time = Math.max(0, player2Time - elapsed);
        }
    }
    return { player1Time, player2Time };
}

function seatColor(game: Game, playerId?: string): Color | null {
    if (playerId && playerId === game.player1Id) return "white";
    if (playerId && playerId === game.player2Id) return "black";
    return null;
}

// The identity a socket established when it joined a game. Actions are
// authorized by THIS, never by a player id sent in the action payload — so a
// client can only ever act as the seat it actually joined as.
function boundId(socket: Socket): string | null {
    return typeof socket.data.playerId === "string"
        ? socket.data.playerId
        : null;
}

// ---------------------------------------------------------------------------
// Game-state emission
// ---------------------------------------------------------------------------

function buildGameState(game: Game): StringifiableGameState {
    const hbchess = new HalfBlindChess(game.fen);
    const turn = toColor(hbchess);
    const { player1Time, player2Time } = liveTimes(game, turn);
    return {
        player1Username: game.player1Username,
        player1Time,
        player2Username: game.player2Username,
        player2Time,
        fen: hbchess.halfBlindFen(),
        dests: JSON.stringify(Array.from(toDests(hbchess))),
        turn,
        timeControl: game.timeControl,
        status: game.status,
        winner: game.winner,
        endReason: game.endReason ?? null,
        drawOfferFrom: game.drawOfferFrom ?? null,
        rematchOfferFrom: game.rematchOfferFrom ?? null,
        rematchGameId: game.rematchGameId ?? null,
        isCheck: hbchess.in_check(),
        isCheckmate: hbchess.in_checkmate(),
        isDraw: hbchess.in_draw(),
    };
}

function emitToRoom(io: Server, gameId: string, game: Game) {
    const state = buildGameState(game);
    logger.info(`emitting gameState for ${gameId}: status=${state.status}`);
    io.to(gameId).emit("gameState", state);
}

function emitToSocket(socket: Socket, game: Game) {
    socket.emit("gameState", buildGameState(game));
}

// (Re)schedule the flag-fall timer for whoever is on move, using their live
// remaining time. Safe to call on any join: it recomputes from live time and
// never resets a running clock. Also recovers timers after a server restart.
function scheduleFlagFallForGame(io: Server, redis: Redis, gameId: string, game: Game) {
    if (game.status !== "active") return;
    const turn = toColor(new HalfBlindChess(game.fen));
    const { player1Time, player2Time } = liveTimes(game, turn);
    const remaining = turn === "white" ? player1Time : player2Time;
    scheduleFlagFall(gameId, remaining, () => handleFlagFall(io, redis, gameId));
}

// Fired when the player on move runs out of time without moving.
async function handleFlagFall(io: Server, redis: Redis, gameId: string) {
    try {
        const game = await loadGame(redis, gameId);
        if (!game || game.status !== "active") return;
        const turn = toColor(new HalfBlindChess(game.fen));
        if (turn === "white") game.player1Time = 0;
        else game.player2Time = 0;
        game.status = "finished";
        game.winner = turn === "white" ? "black" : "white";
        game.endReason = "timeout";
        game.turnStartedAt = null;
        game.drawOfferFrom = undefined;
        await saveGame(redis, gameId, game);
        logger.info(`game ${gameId} ended on time (${turn} flagged)`);
        emitToRoom(io, gameId, game);
        await broadcastLobby(io, redis);
    } catch (err) {
        logger.error(`error handling flag-fall for ${gameId}: ${err}`);
    }
}

// Freeze the clock and mark a game finished (resign / draw agreement).
function finishGame(game: Game, winner: Game["winner"], endReason: Game["endReason"]) {
    const turn = toColor(new HalfBlindChess(game.fen));
    const { player1Time, player2Time } = liveTimes(game, turn);
    game.player1Time = player1Time;
    game.player2Time = player2Time;
    game.status = "finished";
    game.winner = winner;
    game.endReason = endReason;
    game.turnStartedAt = null;
    game.drawOfferFrom = undefined;
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

const addToLobby = (redis: Redis, gameId: string) =>
    redis.sAdd(LOBBY_SET, gameId);
const removeFromLobby = (redis: Redis, gameId: string) =>
    redis.sRem(LOBBY_SET, gameId);

// Compact list of all in-progress (non-finished) games. Reads a maintained
// index (SMEMBERS + MGET) instead of scanning the keyspace with KEYS, and
// self-heals the index by pruning ids whose game is gone or finished.
async function getGameSummaries(redis: Redis): Promise<GameSummary[]> {
    const ids = await redis.sMembers(LOBBY_SET);
    if (ids.length === 0) return [];
    const values = await redis.mGet(ids.map(gameKey));
    const summaries: GameSummary[] = [];
    const stale: string[] = [];
    ids.forEach((id, i) => {
        const val = values[i];
        if (!val) {
            stale.push(id); // key expired (TTL) — drop from index
            return;
        }
        try {
            const game: Game = JSON.parse(val);
            if (game.status === "finished") {
                stale.push(id);
                return;
            }
            summaries.push({
                gameId: id,
                player1Username: game.player1Username,
                player2Username: game.player2Username,
                status: game.status,
                timeControl: game.timeControl,
            });
        } catch {
            stale.push(id);
        }
    });
    if (stale.length) await redis.sRem(LOBBY_SET, stale);
    return summaries;
}

// Push the current game list to everyone viewing the lobby.
async function broadcastLobby(io: Server, redis: Redis) {
    io.to("lobby").emit("lobbyUpdate", await getGameSummaries(redis));
}

// Tell a game room which seats currently have a connected socket. Derived from
// the sockets actually in the room + their bound identities, so it reflects
// real presence (join, refresh, leave, drop).
async function broadcastPresence(io: Server, redis: Redis, gameId: string) {
    const game = await loadGame(redis, gameId);
    if (!game) return;
    const sockets = await io.in(gameId).fetchSockets();
    const present = new Set<string>();
    for (const s of sockets) {
        const pid = s.data?.playerId;
        if (typeof pid === "string") present.add(pid);
    }
    io.to(gameId).emit("presence", {
        white: !!game.player1Id && present.has(game.player1Id),
        black: !!game.player2Id && present.has(game.player2Id),
    });
}

// ---------------------------------------------------------------------------
// Rate limiting (token buckets; refill in tokens/second, up to a burst)
// ---------------------------------------------------------------------------

type Bucket = { tokens: number; last: number; strikes: number };

function take(bucket: Bucket, rate: number, burst: number): boolean {
    const now = Date.now();
    bucket.tokens = Math.min(burst, bucket.tokens + ((now - bucket.last) / 1000) * rate);
    bucket.last = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
}

// Per-socket event limiter. Sustained flooding disconnects the socket.
const SOCKET_RATE = 25; // events/sec sustained
const SOCKET_BURST = 50;
function allowEvent(socket: Socket): boolean {
    const b: Bucket = (socket.data.rate ??= {
        tokens: SOCKET_BURST,
        last: Date.now(),
        strikes: 0,
    });
    if (take(b, SOCKET_RATE, SOCKET_BURST)) {
        b.strikes = 0;
        return true;
    }
    if (++b.strikes > 200) socket.disconnect(true);
    return false;
}

// Per-IP REST limiter (in-memory). Coarse but enough to stop create/user spam.
const REST_RATE = 1; // requests/sec sustained
const REST_BURST = 20;
const restBuckets = new Map<string, Bucket>();
function restAllow(ip: string): boolean {
    let b = restBuckets.get(ip);
    if (!b) {
        b = { tokens: REST_BURST, last: Date.now(), strikes: 0 };
        restBuckets.set(ip, b);
    }
    return take(b, REST_RATE, REST_BURST);
}
// keep the map from growing forever
setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [ip, b] of restBuckets) {
        if (b.last < cutoff) restBuckets.delete(ip);
    }
}, 60_000).unref();

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------

export function registerGameEndpoints(
    app: Application,
    io: Server,
    redisClient: Redis
) {
    // list in-progress (non-finished) games as compact summaries
    app.get("/api/game", async (_, res: Response) => {
        res.send(await getGameSummaries(redisClient));
    });

    // per-IP rate limit on the write endpoints
    const rateLimit = (req: Request, res: Response): boolean => {
        if (restAllow(req.ip || "unknown")) return true;
        res.status(429).send({ error: "Too many requests." });
        return false;
    };

    // upsert a user's chosen display name
    app.post("/api/user", async (req: Request, res: Response) => {
        if (!rateLimit(req, res)) return;
        const { playerId, username } = req.body ?? {};
        const id = sanitizeId(playerId);
        if (id) await upsertUser(redisClient, id, username);
        res.send({ ok: true });
    });

    // create game
    app.post("/api/game", async (req: Request, res: Response) => {
        if (!rateLimit(req, res)) return;
        const player1Id = sanitizeId(req.body?.playerId);
        if (!player1Id) {
            return res.status(400).send({ error: "Invalid player id." });
        }
        // global backpressure: don't let open games grow without bound
        if ((await redisClient.sCard(LOBBY_SET)) >= MAX_OPEN_GAMES) {
            return res
                .status(503)
                .send({ error: "Server busy, try again later." });
        }
        const gameId = uuidv4().split("-")[0];
        const username = sanitizeUsername(req.body?.username);
        const timeControl = normalizeTimeControl(req.body?.timeControl);
        await upsertUser(redisClient, player1Id, username);
        const game: Game = {
            player1Id,
            player1Username: username,
            player1Time: timeControl.base,
            player2Time: timeControl.base,
            fen: DEFAULT_HB_POSITION,
            timeControl,
            turnStartedAt: null,
            status: "waiting",
            winner: null,
        };
        try {
            await saveGame(redisClient, gameId, game);
            await addToLobby(redisClient, gameId);
            logger.info(`created game ${gameId}`);
            await broadcastLobby(io, redisClient);
            res.send({ gameId, game });
        } catch (err) {
            logger.error(`error creating game ${gameId}: ${err}`);
            res.status(500).send({ error: "Could not create game." });
        }
    });
}

// ---------------------------------------------------------------------------
// Socket handlers
// ---------------------------------------------------------------------------

export default function registerGameSocketHandlers(
    io: Server,
    socket: Socket,
    redisClient: Redis
) {
    // subscribe to live lobby updates
    socket.on("joinLobby", async () => {
        if (!allowEvent(socket)) return;
        socket.join("lobby");
        socket.emit("lobbyUpdate", await getGameSummaries(redisClient));
    });

    socket.on("leaveLobby", () => {
        if (!allowEvent(socket)) return;
        socket.leave("lobby");
    });

    // join a game room and receive current state
    socket.on("joinGame", async ({ gameId, playerId, username }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId)) return;
        const id = sanitizeId(playerId);
        const name = sanitizeUsername(username);
        // bind this socket's identity; all later actions are authorized by it
        if (id) socket.data.playerId = id;
        socket.data.gameId = gameId; // for presence recompute on disconnect
        socket.join(gameId);
        try {
            const game = await loadGame(redisClient, gameId);
            if (game === null) {
                socket.emit("gameError", { message: "Game not found." });
                return;
            }
            if (id) await upsertUser(redisClient, id, name);

            if (!game.player2Id && id && game.player1Id !== id) {
                // first other player takes the black seat; game goes live
                game.player2Id = id;
                if (name) game.player2Username = name;
                game.status = "active";
                game.turnStartedAt = Date.now();
                await saveGame(redisClient, gameId, game);
                socket.emit("youAre", { color: "black" }); // private, per-socket
                scheduleFlagFallForGame(io, redisClient, gameId, game);
                emitToRoom(io, gameId, game); // tell everyone
                await broadcastLobby(io, redisClient); // waiting -> active
            } else {
                // returning player or spectator: keep the username fresh
                const color = seatColor(game, id ?? undefined);
                if (color === "white" && name) game.player1Username = name;
                if (color === "black" && name) game.player2Username = name;
                if (color && name) await saveGame(redisClient, gameId, game);
                socket.emit("youAre", { color }); // private, per-socket
                // recover the flag-fall timer if it was lost (e.g. server restart)
                scheduleFlagFallForGame(io, redisClient, gameId, game);
                emitToSocket(socket, game);
            }
            await broadcastPresence(io, redisClient, gameId);
        } catch (err) {
            logger.error(`error fetching game ${gameId}: ${err}`);
        }
    });

    // when a socket drops, refresh presence for the game it was in
    socket.on("disconnect", async () => {
        const gameId = socket.data.gameId;
        if (typeof gameId === "string") {
            await broadcastPresence(io, redisClient, gameId);
        }
    });

    // make a move
    socket.on("move", async ({ gameId, orig, dest }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId) || !isSquare(orig) || !isSquare(dest)) return;
        const id = boundId(socket);
        if (!id) return;
        logger.info(
            `received move from ${id} for ${gameId}: ${orig} to ${dest}`
        );
        try {
            const game = await loadGame(redisClient, gameId);
            if (game === null) return;
            if (game.status !== "active") {
                logger.info(`move rejected: game ${gameId} is ${game.status}`);
                return;
            }
            const hbchess = new HalfBlindChess(game.fen);
            const mover = toColor(hbchess);

            // only the player whose turn it is may move
            if (
                !(mover === "white" && id === game.player1Id) &&
                !(mover === "black" && id === game.player2Id)
            ) {
                logger.error(
                    `player ${id} is not allowed to move at this time in game ${gameId}`
                );
                return;
            }

            const moveRes = hbchess.move({ from: orig, to: dest });
            if (!moveRes) {
                logger.info(`illegal move for ${gameId}: ${orig}->${dest}`);
                return;
            }

            // settle the mover's clock: deduct elapsed, add increment
            const now = Date.now();
            const elapsed = game.turnStartedAt ? now - game.turnStartedAt : 0;
            if (mover === "white") {
                game.player1Time =
                    Math.max(0, game.player1Time - elapsed) +
                    game.timeControl.increment;
            } else {
                game.player2Time =
                    Math.max(0, game.player2Time - elapsed) +
                    game.timeControl.increment;
            }
            game.fen = hbchess.halfBlindFen();
            game.turnStartedAt = now;
            game.drawOfferFrom = undefined; // a move implicitly declines any draw offer

            if (hbchess.in_checkmate()) {
                game.status = "finished";
                game.winner = mover; // the side that just moved delivered mate
                game.endReason = "checkmate";
                game.turnStartedAt = null;
                clearFlagFall(gameId);
            } else if (hbchess.in_draw()) {
                game.status = "finished";
                game.winner = "draw";
                game.endReason = "draw";
                game.turnStartedAt = null;
                clearFlagFall(gameId);
            } else {
                scheduleFlagFallForGame(io, redisClient, gameId, game);
            }

            await saveGame(redisClient, gameId, game);
            logger.info(`updated game ${gameId} to fen ${game.fen}`);
            emitToRoom(io, gameId, game);
            if (game.status === "finished") {
                await broadcastLobby(io, redisClient); // game left the list
            }
        } catch (err) {
            logger.error(`error moving in game ${gameId}: ${err}`);
        }
    });

    // resign
    socket.on("resign", async ({ gameId }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId)) return;
        const id = boundId(socket);
        try {
            const game = await loadGame(redisClient, gameId);
            if (!game || game.status !== "active") return;
            const color = seatColor(game, id ?? undefined);
            if (!color) return;
            finishGame(game, color === "white" ? "black" : "white", "resignation");
            clearFlagFall(gameId);
            await saveGame(redisClient, gameId, game);
            logger.info(`game ${gameId}: ${color} resigned`);
            emitToRoom(io, gameId, game);
            await broadcastLobby(io, redisClient);
        } catch (err) {
            logger.error(`error resigning in game ${gameId}: ${err}`);
        }
    });

    // offer a draw
    socket.on("offerDraw", async ({ gameId }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId)) return;
        const id = boundId(socket);
        try {
            const game = await loadGame(redisClient, gameId);
            if (!game || game.status !== "active") return;
            const color = seatColor(game, id ?? undefined);
            if (!color) return;
            game.drawOfferFrom = color;
            await saveGame(redisClient, gameId, game);
            emitToRoom(io, gameId, game);
        } catch (err) {
            logger.error(`error offering draw in game ${gameId}: ${err}`);
        }
    });

    // respond to a draw offer
    socket.on("respondDraw", async ({ gameId, accept }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId)) return;
        const id = boundId(socket);
        try {
            const game = await loadGame(redisClient, gameId);
            if (!game || game.status !== "active" || !game.drawOfferFrom) return;
            const color = seatColor(game, id ?? undefined);
            if (!color || color === game.drawOfferFrom) return; // only opponent responds
            if (accept) {
                finishGame(game, "draw", "draw-agreement");
                clearFlagFall(gameId);
            } else {
                game.drawOfferFrom = undefined;
            }
            await saveGame(redisClient, gameId, game);
            emitToRoom(io, gameId, game);
            if (accept) {
                await broadcastLobby(io, redisClient); // game left the list
            }
        } catch (err) {
            logger.error(`error responding to draw in game ${gameId}: ${err}`);
        }
    });

    // request a rematch; when both players ask, spin up a swapped-colors game
    socket.on("rematch", async ({ gameId }) => {
        if (!allowEvent(socket)) return;
        if (!isValidGameId(gameId)) return;
        const id = boundId(socket);
        try {
            const game = await loadGame(redisClient, gameId);
            if (!game || game.status !== "finished") return;
            const color = seatColor(game, id ?? undefined);
            if (!color) return;

            // already agreed: just point this player at the new game
            if (game.rematchGameId) {
                socket.emit("rematchReady", { gameId: game.rematchGameId });
                return;
            }

            if (game.rematchOfferFrom && game.rematchOfferFrom !== color) {
                // both sides agreed — create the new game with swapped colors.
                // Only player1 is seated so the normal join flow starts the clock.
                const newId = uuidv4().split("-")[0];
                const newGame: Game = {
                    player1Id: game.player2Id!,
                    player1Username: game.player2Username,
                    player1Time: game.timeControl.base,
                    player2Time: game.timeControl.base,
                    fen: DEFAULT_HB_POSITION,
                    timeControl: game.timeControl,
                    turnStartedAt: null,
                    status: "waiting",
                    winner: null,
                };
                await saveGame(redisClient, newId, newGame);
                await addToLobby(redisClient, newId);
                game.rematchGameId = newId;
                await saveGame(redisClient, gameId, game);
                logger.info(`game ${gameId}: rematch created as ${newId}`);
                io.to(gameId).emit("rematchReady", { gameId: newId });
                await broadcastLobby(io, redisClient); // new waiting game appears
            } else if (!game.rematchOfferFrom) {
                game.rematchOfferFrom = color;
                await saveGame(redisClient, gameId, game);
                emitToRoom(io, gameId, game);
            }
        } catch (err) {
            logger.error(`error handling rematch in game ${gameId}: ${err}`);
        }
    });
}
