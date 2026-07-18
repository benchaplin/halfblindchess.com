// The half-blind FEN's first token encodes moves-until-next-half-blind: a
// single digit (0/1/2), or a 4-char "fromto" when a half-blind move is being
// displayed. Chessground's `halfBlindMove` should be that count so that when
// it's 0 (the current move is half-blind) a drop fades the piece in place
// instead of moving it to the destination.
export function halfBlindMoveFromFen(fen: string): number {
    const prefix = fen.split(" ")[0];
    // display state (a half-blind move just happened): the next is 2 moves away
    if (prefix.length > 1) return 2;
    return parseInt(prefix, 10);
}

// Is the FEN in the "hidden half-blind" display state (piece faded at origin)?
export function isHalfBlindDisplay(fen: string): boolean {
    return fen.split(" ")[0].length > 1;
}
