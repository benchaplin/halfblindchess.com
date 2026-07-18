import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
} from "vitest";
import { io as ioClient, Socket } from "socket.io-client";
import {
    startServer,
    StartedServer,
    createClient,
} from "../../game-server/server";

// Probe a throwaway Redis db up front; if it isn't reachable, skip the whole
// suite (these tests need a live Redis). Unit tests cover the pure logic.
async function probeRedis() {
    const client = createClient({
        database: 15,
        socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    try {
        await client.connect();
        return client as any;
    } catch {
        return null;
    }
}
const redis = await probeRedis();
const available = redis !== null;

describe.skipIf(!available)("socket protocol (integration)", () => {
    let srv: StartedServer;
    let base: string;
    const sockets: Socket[] = [];

    beforeAll(async () => {
        await redis.flushDb();
        srv = await startServer({ port: 0, redisClient: redis });
        base = `http://localhost:${srv.port}`;
    });
    afterAll(async () => {
        if (srv) await srv.close();
        if (redis?.isOpen) await redis.quit();
    });
    beforeEach(async () => {
        await redis.flushDb();
    });
    afterEach(() => {
        while (sockets.length) sockets.pop()!.close();
    });

    // ---- helpers ----
    const connect = (): Socket => {
        const s = ioClient(base, {
            transports: ["websocket"],
            forceNew: true,
            reconnection: false,
        });
        sockets.push(s);
        return s;
    };
    const once = <T = any>(s: Socket, ev: string): Promise<T> =>
        new Promise((res) => s.once(ev, res as any));
    const waitState = (s: Socket, pred: (x: any) => boolean, ms = 4000): Promise<any> =>
        new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                s.off("gameState", h);
                reject(new Error("timeout waiting for gameState"));
            }, ms);
            const h = (x: any) => {
                if (pred(x)) {
                    clearTimeout(t);
                    s.off("gameState", h);
                    resolve(x);
                }
            };
            s.on("gameState", h);
        });
    const createGame = async (playerId: string, username: string, tc?: any) => {
        const r = await fetch(`${base}/api/game`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerId,
                username,
                timeControl: tc ?? { base: 300_000, increment: 0 },
            }),
        });
        return r.json() as Promise<{ gameId: string }>;
    };
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // seat two players and wait until the game is active
    async function startGame(tc?: any) {
        const { gameId } = await createGame("p_alice", "Alice", tc);
        const a = connect();
        const b = connect();
        const aColor = once<{ color: string }>(a, "youAre");
        const active = waitState(a, (s) => s.status === "active");
        a.emit("joinGame", { gameId, playerId: "p_alice", username: "Alice" });
        await sleep(80);
        b.emit("joinGame", { gameId, playerId: "p_bob", username: "Bob" });
        const state = await active;
        return { gameId, a, b, state, aColor };
    }

    it("seats players, goes active, and reports usernames + own color", async () => {
        const { state, aColor } = await startGame();
        expect(state.status).toBe("active");
        expect(state.player1Username).toBe("Alice");
        expect(state.player2Username).toBe("Bob");
        expect(state.turn).toBe("white");
        expect((await aColor).color).toBe("white"); // told privately, no ids broadcast
    });

    it("relays a move: turn flips and the move is recorded", async () => {
        const { gameId, a, b } = await startGame({ base: 300_000, increment: 3_000 });
        const next = waitState(b, (s) => s.turn === "black");
        a.emit("move", { gameId, orig: "e2", dest: "e4" });
        const s = await next;
        expect(s.turn).toBe("black");
        expect(s.history[0].san).toBe("e4");
        expect(s.player1Time).toBeGreaterThan(300_000); // increment applied
    });

    it("redacts a still-hidden half-blind move on the wire", async () => {
        const { gameId, a, b } = await startGame();
        // white e2-e4 (normal)
        const afterWhite = waitState(b, (s) => s.history.length === 1);
        a.emit("move", { gameId, orig: "e2", dest: "e4" });
        await afterWhite;
        // black e7-e5 (black's first move => half-blind => redacted)
        const hidden = waitState(a, (s) => s.history.length === 2);
        b.emit("move", { gameId, orig: "e7", dest: "e5" });
        const mv = (await hidden).history[1];
        expect(mv.hidden).toBe(true);
        expect(mv.san).toBeNull();
        expect(mv.piece).toBe("p");
        expect(JSON.stringify(mv)).not.toContain("e5");
    });

    it("resign ends the game for the opponent", async () => {
        const { gameId, a, b } = await startGame();
        const done = waitState(b, (s) => s.status === "finished");
        a.emit("resign", { gameId });
        const s = await done;
        expect(s.winner).toBe("black");
        expect(s.endReason).toBe("resignation");
    });

    it("draw offer + accept draws the game", async () => {
        const { gameId, a, b } = await startGame();
        const offered = waitState(a, (s) => s.drawOfferFrom === "black");
        b.emit("offerDraw", { gameId });
        await offered;
        const done = waitState(a, (s) => s.status === "finished");
        a.emit("respondDraw", { gameId, accept: true });
        const s = await done;
        expect(s.winner).toBe("draw");
        expect(s.endReason).toBe("draw-agreement");
    });

    it("flag-fall ends the game on time", async () => {
        const { a } = await startGame({ base: 800, increment: 0 });
        const s = await waitState(a, (x) => x.status === "finished", 5000);
        expect(s.winner).toBe("black"); // white was on move and flagged
        expect(s.endReason).toBe("timeout");
    });

    it("rematch spins up a new game with swapped colors", async () => {
        const { gameId, a, b } = await startGame();
        const done = waitState(a, (s) => s.status === "finished");
        a.emit("resign", { gameId });
        await done;
        const ready = once<{ gameId: string }>(a, "rematchReady");
        a.emit("rematch", { gameId });
        await sleep(60);
        b.emit("rematch", { gameId });
        const { gameId: newId } = await ready;
        expect(newId).not.toBe(gameId);

        const a2 = connect();
        const b2 = connect();
        const active = waitState(a2, (s) => s.status === "active");
        a2.emit("joinGame", { gameId: newId, playerId: "p_bob", username: "Bob" });
        await sleep(80);
        b2.emit("joinGame", { gameId: newId, playerId: "p_alice", username: "Alice" });
        const s = await active;
        expect(s.player1Username).toBe("Bob"); // old black is now white
        expect(s.player2Username).toBe("Alice");
    });

    it("lobby updates live on create / activate / finish", async () => {
        const lobby = connect();
        const first = once<any[]>(lobby, "lobbyUpdate");
        lobby.emit("joinLobby");
        expect(Array.isArray(await first)).toBe(true);

        const sawCreate = new Promise<any[]>((res) => {
            const h = (l: any[]) => {
                if (l.some((g) => g.player1Username === "Alice" && g.status === "waiting")) {
                    lobby.off("lobbyUpdate", h);
                    res(l);
                }
            };
            lobby.on("lobbyUpdate", h);
        });
        const { gameId, a, b } = await startGame(); // creates + activates
        await sawCreate;

        const sawGone = new Promise<any[]>((res) => {
            const h = (l: any[]) => {
                if (!l.some((g) => g.gameId === gameId)) {
                    lobby.off("lobbyUpdate", h);
                    res(l);
                }
            };
            lobby.on("lobbyUpdate", h);
        });
        a.emit("resign", { gameId });
        const gone = await sawGone;
        expect(gone.some((g: any) => g.gameId === gameId)).toBe(false);
        void b;
    });

    it("presence flips a seat offline when a player drops", async () => {
        const { a, b } = await startGame();
        const bobGone = new Promise<any>((res) => {
            const h = (p: any) => {
                if (p.white && !p.black) {
                    a.off("presence", h);
                    res(p);
                }
            };
            a.on("presence", h);
        });
        b.disconnect();
        const p = await bobGone;
        expect(p).toEqual({ white: true, black: false });
    });

    it("does not broadcast player ids and blocks impersonation", async () => {
        const { gameId, a, state } = await startGame();
        expect("player1Id" in state).toBe(false);
        expect("player2Id" in state).toBe(false);

        // an attacker who somehow knows the victim's id still can't act as them
        const attacker = connect();
        attacker.emit("joinGame", { gameId, playerId: "p_evil", username: "mallory" });
        await sleep(120);
        attacker.emit("resign", { gameId, playerId: "p_alice" }); // forged
        await sleep(200);
        const list = await (await fetch(`${base}/api/game`)).json();
        expect(list.some((g: any) => g.gameId === gameId)).toBe(true); // still active
        void a;
    });

    it("survives a malformed move (crash vector) and stays responsive", async () => {
        const s = connect();
        await once(s, "connect");
        s.emit("move", { gameId: "deadbeef", orig: "e2", dest: "e4" }); // unknown game
        s.emit("move", { gameId: { evil: true }, orig: "??", dest: null }); // garbage
        await sleep(200);
        const res = await fetch(`${base}/api/game`);
        expect(res.ok).toBe(true);
    });
});
