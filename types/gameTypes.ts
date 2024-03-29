import { Color, Key } from "halfblindchessground/types";

// stored in DB
export type Game = {
    player1Id: string;
    player2Id?: string;
    fen: string;
};

export type GameState = {
    player1Id: string; // white
    player2Id?: string; // black
    fen: string;
    dests: Map<Key, Key[]>;
    turn: Color;
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
};

export type StringifiableGameState = {
    player1Id: string;
    player2Id?: string;
    fen: string;
    dests: string;
    turn: Color;
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
};
