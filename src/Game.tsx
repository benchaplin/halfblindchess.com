import { useRef, useEffect, useState } from "react";
import { setupBoard, setupAfterMoveEvt } from "./utils/hbcgHelpers";
import { socket } from "./socket";
import { useParams } from "react-router-dom";
import { StringifiableGameState } from "../types/gameTypes";
import { Color, Key } from "halfblindchessground/types";
import NameBadge from "./components/NameBadge";

export default function Game() {
    const { gameId } = useParams();
    const board = useRef(null);

    const [player1, setPlayer1] = useState(null);
    const [player2, setPlayer2] = useState(null);

    const [orientation, setOrientation] = useState("white");

    const [winner, setWinner] = useState(null);
    const [isDraw, setIsDraw] = useState(null);

    useEffect(() => {
        console.log("connecting");
        socket.connect();

        const playerId = localStorage.getItem("playerId");
        socket.emit("joinGame", { gameId, playerId });

        // move this
        socket.on("gameState", (gameState: StringifiableGameState) => {
            console.log(`received gameState: ${JSON.stringify(gameState)}`);
            const myColor =
                playerId === gameState.player1Id
                    ? "white"
                    : playerId === gameState.player2Id
                    ? "black"
                    : null;

            const dests: Map<Key, Key[]> = new Map(JSON.parse(gameState.dests));
            const myOrientation: Color = myColor || "white";
            setOrientation(myOrientation);

            const viewOnly = myColor !== gameState.turn;
            if (board.current !== null) {
                const cg = setupBoard(
                    board.current,
                    { ...gameState, dests },
                    myOrientation,
                    viewOnly
                );
                setupAfterMoveEvt(cg, socket, gameId, playerId);
            }

            setPlayer1(gameState.player1Id);
            if (gameState.player2Id) setPlayer2(gameState.player2Id);

            setWinner(
                gameState.isCheckmate
                    ? gameState.turn === "black"
                        ? "White"
                        : "Black"
                    : null
            );
            setIsDraw(gameState.isDraw);
        });

        return () => {
            console.log("disconnecting");
            socket.disconnect();
        };
    }, [board]);

    return (
        <>
            <div className="my-4">
                {orientation === "white" ? (
                    <NameBadge color="red" name={player2} />
                ) : (
                    <NameBadge color="green" name={player1} />
                )}
            </div>
            <div ref={board} style={{ width: 500, height: 500 }} />
            {(winner || isDraw) && (
                <div className="overlay-window">
                    {winner ? (
                        <p>
                            Checkmate!
                            <br />
                            {winner} wins.
                        </p>
                    ) : (
                        <p>Draw!</p>
                    )}
                </div>
            )}
            <div className="my-4">
                {orientation === "white" ? (
                    <NameBadge color="green" name={player1} />
                ) : (
                    <NameBadge color="red" name={player2} />
                )}
            </div>
        </>
    );
}
