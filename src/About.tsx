export default function About() {
  return (
    <div className="my-2">
      <p>
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
            className="text-indigo-700 hover:underline"
          >
            https://github.com/benchaplin/halfblindchess.com
          </a>{" "}
          - the React code for the web app, alongside the game server
        </li>
        <li className="mb-2">
          <a
            href="https://github.com/benchaplin/halfblindchess"
            className="text-indigo-700 hover:underline"
          >
            https://github.com/benchaplin/halfblindchess
          </a>{" "}
          - the chess logic, built on top of chess.js
        </li>
        <li className="mb-2">
          <a
            href="https://github.com/benchaplin/halfblindchessground"
            className="text-indigo-700 hover:underline"
          >
            https://github.com/benchaplin/halfblindchessground
          </a>{" "}
          - the chess board UI, forked from{" "}
          <a href="lichess.org" className="text-indigo-700 hover:underline">
            lichess.org
          </a>
          's chessground
        </li>
      </ul>
    </div>
  );
}
