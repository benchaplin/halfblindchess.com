type NameBadgeProps = {
    name?: string;
    color: "red" | "green";
    winner?: boolean;
};

export default function NameBadge({ name, color, winner }: NameBadgeProps) {
    return (
        <div className="inline-block bg-stone-200 border border-solid border-slate-800 py-2 px-3 rounded">
            <h2 className={`text-l ${name && "font-bold"}`}>
                <img
                    className="inline-block mr-2"
                    src={`../avatar_${color}.svg`}
                    width="20"
                    alt=""
                />
                {name || <i>waiting for opponent...</i>}{" "}
                {winner && (
                    <img
                        className="inline-block mr-2"
                        src="../trophy.svg"
                        width="25"
                        alt=""
                    />
                )}
            </h2>
        </div>
    );
}
