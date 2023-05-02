import { HalfBlindMove } from "halfblindchess";
import { Color, Key } from "halfblindchessground/types"

export type GameState = {
    fen: string,
    dests: Map<Key, Key[]>,
    color: Color,
    lastHalfBlindMove: HalfBlindMove
};

export type StringifiableGameState = {
    fen: string,
    dests: string,
    color: Color,
    lastHalfBlindMove: HalfBlindMove
};