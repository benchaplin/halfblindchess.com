export default function ErrorAlert({ children }) {
    return (
        <div
            className="bg-red-100 border border-red-800 text-red-800 px-4 py-3 rounded relative"
            role="alert"
        >
            <span className="block sm:inline">{children}</span>
        </div>
    );
}
