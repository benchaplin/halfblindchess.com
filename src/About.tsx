export default function About() {
    return (
        <div className="my-2">
            <p className="mb-4">
                halfblindchess.com is a free, open-source chess server for the
                half-blind chess variant.
            </p>
            <p>
                Contributions are welcome, the codebase is split into three
                repositories:
            </p>
            <ul className="list-disc mt-4">
                <li className="mb-2">
                    <a
                        href="https://github.com/benchaplin/halfblindchess.com"
                        className="link"
                    >
                        https://github.com/benchaplin/halfblindchess.com
                    </a>{" "}
                    - the React code for the web app, alongside the game server
                </li>
                <li className="mb-2">
                    <a
                        href="https://github.com/benchaplin/halfblindchess"
                        className="link"
                    >
                        https://github.com/benchaplin/halfblindchess
                    </a>{" "}
                    - the half-blind chess logic, built on top of chess.js
                </li>
                <li className="mb-2">
                    <a
                        href="https://github.com/benchaplin/halfblindchessground"
                        className="link"
                    >
                        https://github.com/benchaplin/halfblindchessground
                    </a>{" "}
                    - the chess board UI, forked from{" "}
                    <a href="https://lichess.org" className="link">
                        lichess.org
                    </a>
                    's chessground
                </li>
            </ul>
        </div>
    );
}
