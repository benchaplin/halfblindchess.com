import { Color, Key } from "halfblindchessground/types";

export type GameState = {
    fen: string;
    dests: Map<Key, Key[]>;
    color: Color;
};

export type StringifiableGameState = {
    fen: string;
    dests: string;
    color: Color;
};
