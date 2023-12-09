import { useContext } from "react";
import "./app.css";
import { Theme } from "./lib/ColorTheme.jsx";
import ThemeButton from "./lib/ThemeButton.jsx";
import LoginButton from "./lib/LoginButton.jsx";

function App() {
    const { theme } = useContext(Theme);
    return (
        <main className={`app ${theme}`}>
            <header className="app-header">
                <ThemeButton />
                <LoginButton />
            </header>
            <div className="title-wrapper">
                <h1 className="home-title">Pocket Drive</h1>
                <p className="sub">
                    A google drive based image & bookmark application
                </p>
            </div>
        </main>
    );
}

export default App;
