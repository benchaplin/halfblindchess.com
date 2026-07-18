import { useState } from "react";
import { SERVER_URL } from "../constants";

type UsernameModalProps = {
    initial: string;
    dismissable: boolean; // false on first run — a name must be chosen
    onSave: (name: string) => void;
    onClose: () => void;
};

export default function UsernameModal({
    initial,
    dismissable,
    onSave,
    onClose,
}: UsernameModalProps) {
    const [name, setName] = useState(initial);

    const save = () => {
        const trimmed = name.trim().slice(0, 20);
        if (!trimmed) return;
        localStorage.setItem("username", trimmed);
        fetch(`${SERVER_URL}/api/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerId: localStorage.getItem("playerId"),
                username: trimmed,
            }),
        }).catch(() => {
            /* best-effort; the name is already stored locally */
        });
        onSave(trimmed);
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)", zIndex: 50 }}
            onClick={() => dismissable && onClose()}
        >
            <div
                className="bg-stone-200 border border-solid border-slate-800 rounded p-6"
                style={{ width: 340 }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-l font-bold mb-3">Choose a username</h2>
                <input
                    autoFocus
                    className="w-full border border-solid border-slate-800 rounded py-2 px-3 mb-4 font-mono"
                    value={name}
                    maxLength={20}
                    placeholder="username"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <div className="text-right">
                    {dismissable && (
                        <button
                            className="mr-2 btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={save}
                        disabled={!name.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
