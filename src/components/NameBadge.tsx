type NameBadgeProps = {
    name?: string;
    color: "red" | "green";
};

export default function NameBadge({ name, color }: NameBadgeProps) {
    return (
        <div className="inline-block bg-stone-400 py-2 px-3 rounded">
            <h2 className={`text-l ${name && "font-bold"}`}>
                <img
                    className="inline-block mr-2"
                    src={`../avatar_${color}.svg`}
                    width="20"
                    alt=""
                />
                {name || <i>waiting for opponent...</i>}
            </h2>
        </div>
    );
}
