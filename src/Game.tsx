import { useRef, useEffect, useState } from "react";
import { setupBoard, setupAfterMoveEvt } from "./utils/hbcgHelpers";
import { socket } from "./socket";
import { useParams } from "react-router-dom";
import { StringifiableGameState } from "../types/gameTypes";
import { Key } from "halfblindchessground/types";

export default function Game() {
    const { gameId } = useParams();
    const board = useRef(null);

    const [player1, setPlayer1] = useState(null);
    const [player2, setPlayer2] = useState(null);

    useEffect(() => {
        console.log("connecting");
        socket.connect();

        const playerId = localStorage.getItem("playerId");
        socket.emit("joinGame", { gameId, playerId });

        socket.on("gameState", (gameState: StringifiableGameState) => {
            console.log(`received gameState: ${JSON.stringify(gameState)}`);
            const dests: Map<Key, Key[]> = new Map(JSON.parse(gameState.dests));
            if (board.current !== null) {
                const cg = setupBoard(board.current, { ...gameState, dests });
                setupAfterMoveEvt(cg, socket, gameId, playerId);
            }
            setPlayer1(gameState.player1Id);
            if (gameState.player2Id) setPlayer2(gameState.player2Id);
        });

        return () => {
            console.log("disconnecting");
            socket.disconnect();
        };
    }, [board]);

    return (
        <div>
            <h2 className={`text-l my-5 ${player2 && "font-bold"}`}>
                {player2 ? (
                    <>
                        <img
                            className="inline-block mr-2"
                            src="../avatar_red.svg"
                            width="20"
                            alt=""
                        />
                        {player2}
                    </>
                ) : (
                    <>
                        <img
                            className="inline-block mr-2"
                            src="../avatar_empty.svg"
                            width="20"
                            alt=""
                        />
                        <i>waiting for opponent...</i>
                    </>
                )}
            </h2>
            <div ref={board} style={{ width: 500, height: 500 }} />
            <h2 className="text-l font-bold my-5">
                <img
                    className="inline-block mr-2"
                    src="../avatar_green.svg"
                    width="20"
                    alt=""
                />
                {player1}
            </h2>
        </div>
    );
}
