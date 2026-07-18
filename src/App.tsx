import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Nav from "./Nav.tsx";
import { Outlet } from "react-router-dom";
import UsernameModal from "./components/UsernameModal";

export default function App() {
    const [username, setUsername] = useState(
        () => localStorage.getItem("username") || ""
    );
    const [editingName, setEditingName] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem("playerId")) {
            localStorage.setItem("playerId", `p_${uuidv4().split("-")[0]}`);
        }
        if (!localStorage.getItem("username")) {
            setEditingName(true);
        }
    }, []);

    return (
        <main
            className="flex min-h-screen justify-center bg-stone-300 font-mono"
            style={{ paddingTop: 200, paddingBottom: 200 }}
        >
            <Nav username={username} onEditName={() => setEditingName(true)} />
            <div style={{ width: 700 }}>
                <h1 className="text-2xl mb-5">Half-Blind Chess</h1>
                <Outlet />
            </div>
            {editingName && (
                <UsernameModal
                    initial={username}
                    dismissable={!!username}
                    onSave={(name) => {
                        setUsername(name);
                        setEditingName(false);
                    }}
                    onClose={() => setEditingName(false)}
                />
            )}
        </main>
    );
}
