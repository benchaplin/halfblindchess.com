import { Color, Key } from "halfblindchessground/types";

// A time control, in milliseconds.
export type TimeControl = {
    base: number; // starting clock per player
    increment: number; // added to a player's clock after each of their moves
};

export type GameStatus = "waiting" | "active" | "finished";

// A move as stored server-side (full truth, including the hidden destination).
export type MoveRecord = {
    san: string; // e.g. "e4", "Nf3"
    piece: string; // p, n, b, r, q, k
    color: "w" | "b";
    halfBlind: boolean;
};

// A move as sent to clients. While a half-blind move is still hidden (it's the
// latest move and no reply has been made), `san` is redacted to null so the
// destination never crosses the wire — the opponent only learns which piece
// moved. Once revealed, `san` is the real notation.
export type MoveView = {
    san: string | null;
    piece: string;
    color: "w" | "b";
    halfBlind: boolean;
    hidden: boolean;
};

// Result of a finished game.
export type GameResult = "white" | "black" | "draw";

export type EndReason =
    | "checkmate"
    | "resignation"
    | "timeout"
    | "draw-agreement"
    | "draw"; // draw detected by the engine (stalemate, repetition, 50-move, etc.)

// stored in DB
export type Game = {
    player1Id: string; // white
    player1Username?: string;
    player1Time: number; // ms remaining as of turnStartedAt
    player2Id?: string; // black
    player2Username?: string;
    player2Time: number; // ms remaining as of turnStartedAt
    fen: string;
    history: MoveRecord[];
    timeControl: TimeControl;
    turnStartedAt: number | null; // epoch ms when the current turn began; null unless active
    status: GameStatus;
    winner: GameResult | null;
    endReason?: EndReason;
    drawOfferFrom?: Color; // color with an outstanding draw offer
    rematchOfferFrom?: Color; // color that has offered a rematch
    rematchGameId?: string; // id of the follow-up game once a rematch is agreed
};

// A lightweight, login-less user record.
export type User = {
    id: string;
    username: string;
};

// Compact game info for the lobby list. Player ids are intentionally NOT
// included — they are each player's only secret in the guest model.
export type GameSummary = {
    gameId: string;
    player1Username?: string;
    player2Username?: string;
    status: GameStatus;
    timeControl: TimeControl;
};

// Told privately to a socket on join so it knows which side it controls,
// without any player id ever being broadcast.
export type SeatAssignment = {
    color: Color | null; // null = spectator
};

// Whether each seat currently has a connected socket.
export type Presence = {
    white: boolean;
    black: boolean;
};

// Fields shared by the wire and runtime game-state shapes below.
// Note: player ids are never sent to clients (see SeatAssignment).
type GameStateBase = {
    player1Username?: string; // white
    player1Time: number; // live ms remaining at emit time
    player2Username?: string; // black
    player2Time: number; // live ms remaining at emit time
    fen: string;
    history: MoveView[];
    turn: Color;
    timeControl: TimeControl;
    status: GameStatus;
    winner: GameResult | null;
    endReason: EndReason | null;
    drawOfferFrom: Color | null;
    rematchOfferFrom: Color | null;
    rematchGameId: string | null;
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
};

export type GameState = GameStateBase & {
    dests: Map<Key, Key[]>;
};

export type StringifiableGameState = GameStateBase & {
    dests: string; // JSON-stringified [Key, Key[]][]
};
