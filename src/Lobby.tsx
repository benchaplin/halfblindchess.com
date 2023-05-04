import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import ErrorAlert from "./ErrorAlert";

export default function Lobby() {
    const queryClient = useQueryClient();
    const { data, error } = useQuery("games", () =>
        fetch("http://localhost:3000/game").then((res) => res.json())
    );
    const {
        mutate: createNewGame,
        isLoading: isCreatingNewGame,
        data: newGameData,
        error: newGameError,
    } = useMutation({
        mutationFn: async () => {
            return fetch("http://localhost:3000/game", { method: "POST" }).then(
                (res) => res.json()
            );
        },
        onSuccess: () => queryClient.invalidateQueries(["games"]),
    });

    return (
        <div>
            <button
                className="bg-stone-600 hover:bg-stone-900 text-white rounded p-2"
                onClick={() => createNewGame()}
                disabled={isCreatingNewGame}
            >
                Create challenge link
            </button>
            {newGameData && (
                <p className="mt-2">
                    <Link
                        className="text-indigo-700 hover:underline"
                        to={`/game/${newGameData.gameId}`}
                    >
                        http://halfblindchess.com/game/{newGameData.gameId}
                    </Link>
                </p>
            )}
            <h2 className="text-l my-5">Games in progress:</h2>
            <ul className="list-disc">
                {data?.map((gameId: string) => (
                    <li key={gameId}>
                        <Link
                            className="text-indigo-700 hover:underline"
                            to={`/game/${gameId}`}
                        >
                            {gameId}
                        </Link>
                    </li>
                ))}
                {error && (
                    <ErrorAlert>
                        Something went wrong fetching games.
                    </ErrorAlert>
                )}
            </ul>
        </div>
    );
}
