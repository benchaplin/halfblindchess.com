import { Api } from "halfblindchessground/api";
import { Color, Key } from "halfblindchessground/types";
import { Chessground } from "halfblindchessground";
import { Socket } from "socket.io-client";

export function setupBoard(ref: HTMLElement, fen: string, dests: any, color: Color): Api {
    const cg = Chessground(ref, {
        fen,
        turnColor: color,
        movable: {
            color,
            free: false,
            dests,
        },
        draggable: {
            showGhost: true,
        },
    });
    return cg;
}

export function setupAfterMoveEvt(cg: Api, socket: Socket) {
    cg.set({
        movable: {
            events: {
                after: playOtherSide(cg, socket),
            },
        },
    });
}

function playOtherSide(cg: Api, socket: Socket) {
    return (orig: Key, dest: Key) => {
        console.log(`emitting move: ${orig} to ${dest}`)
        socket.emit('move', { orig, dest });
    };
}