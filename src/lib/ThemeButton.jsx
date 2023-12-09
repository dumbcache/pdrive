import { useContext } from "react";
import { Theme } from "./ColorTheme";
import lightModeIcon from "../assets/lightMode.svg";
import darkModeIcon from "../assets/darkMode.svg";

const ThemeButton = () => {
    const { theme, toggleTheme } = useContext(Theme);
    return (
        <>
            <button
                type="button"
                className="color-scheme"
                aria-label="Dark mode"
                role="switch"
                aria-checked="false"
                title="toggle dark mode"
                onClick={toggleTheme}
            >
                {theme === "" ? (
                    <img src={lightModeIcon} alt="light mode icon" />
                ) : (
                    <img src={darkModeIcon} alt="dark mode icon" />
                )}
            </button>
        </>
    );
};

export default ThemeButton;
