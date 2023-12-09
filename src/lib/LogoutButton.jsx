import logoutIcon from "../assets/logout.svg";

const LogoutButton = () => {
    return (
        <>
            <button className="button__signout btn" title="logout">
                <img src={logoutIcon} alt="logout icon" />
            </button>
        </>
    );
};

export default LogoutButton;
