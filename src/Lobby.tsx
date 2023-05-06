import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ErrorAlert from "./ErrorAlert";
import { SERVER_URL } from "./constants";

export default function Lobby() {
    const queryClient = useQueryClient();
    const { data: games, error: gamesError } = useQuery("games", () =>
        fetch(`${SERVER_URL}/api/game`).then((res) => res.json())
    );
    const {
        mutate: createNewGame,
        isLoading: isCreatingNewGame,
        data: newGameData,
        error: newGameError,
    } = useMutation({
        mutationFn: async () => {
            return fetch(`${SERVER_URL}/api/game`, { method: "POST" }).then(
                (res) => res.json()
            );
        },
        onSuccess: () => queryClient.invalidateQueries(["games"]),
    });

    return (
        <div>
            <button
                className="bg-amber-600 hover:bg-amber-800 text-white rounded py-2 px-3"
                onClick={() => createNewGame()}
                disabled={isCreatingNewGame}
            >
                Create challenge link
            </button>
            {newGameData && (
                <p className="mt-2">
                    <CopyToClipboard
                        text={`https://halfblindchess.com/game/${newGameData.gameId}`}
                        onCopy={() =>
                            document
                                .querySelector(".copy-icon")
                                .classList.add("animate-copied")
                        }
                    >
                        <img
                            className="hover:cursor-pointer inline mr-2 copy-icon"
                            src="../copy.svg"
                            width="25"
                            alt="copy"
                        />
                    </CopyToClipboard>
                    <Link className="link" to={`/game/${newGameData.gameId}`}>
                        https://halfblindchess.com/game/{newGameData.gameId}
                    </Link>
                </p>
            )}
            {newGameError && (
                <ErrorAlert>
                    Something went wrong creating a new game.
                </ErrorAlert>
            )}
            <hr className="my-10 border-black" />
            <h2 className="text-l my-5">Games in progress:</h2>
            <ul className="list-disc">
                {games?.map((gameId: string) => (
                    <li key={gameId}>
                        <Link className="link" to={`/game/${gameId}`}>
                            https://halfblindchess.com/game/{gameId}
                        </Link>
                    </li>
                ))}
                {gamesError && (
                    <ErrorAlert>
                        Something went wrong fetching games.
                    </ErrorAlert>
                )}
            </ul>
        </div>
    );
}
