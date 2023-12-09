// import { goto } from "$app/navigation";
// import { PUBLIC_KRAB_CLIENT_ID } from "$env/static/public";
// import { get } from "svelte/store";
// import { browser } from "$app/environment";
// import ChildWorker from "$lib/scripts/worker.ts?worker";
// import {
//     activeParentId,
//     activeParentName,
//     touchCoords,
//     isLoggedin,
//     previewItem,
//     dropItems,
//     recents,
//     dataCacheName,
//     editItems,
//     selectedCount,
//     mode,
//     editConfirm,
//     sessionTimeout,
//     activeTimeout,
//     editMode,
//     activeDirs,
//     tempImgs,
//     activeImgs,
//     tempDirs,
//     blobLocations,
//     globalSearch,
//     reverseActive,
//     favoritesActive,
//     selectAll,
//     editProgress,
//     dirCreateToggle,
//     dropFull,
//     dropMini,
//     autosave,
//     shortcuts,
// } from "$lib/scripts/stores";
// import {
//     fetchFiles,
//     refreshMainContent,
//     createRootDir,
//     refreshCache,
// } from "./drive";

export let childWorker: Worker;
export let client, accessToken: string;
if (browser) {
    childWorker = new ChildWorker();
    childWorker.onerror = (e) => console.warn(e);
    childWorker.onmessage = ({ data }) => {
        switch (data.context) {
            case "IMG_PREVIEW":
                const { id, blob } = data;
                const previewImg = document.querySelector(
                    ".preview-img"
                ) as HTMLImageElement;
                const target = document.querySelector(
                    `[data-id='${id}']`
                ) as HTMLDivElement;
                if (previewImg.dataset.id !== id) return;
                const url = URL.createObjectURL(blob);
                previewImg.src = url;
                target.dataset.url = url;
                blobLocations.set({ ...get(blobLocations), [id]: url });
                return;

            case "IMG_PREVIEW_FAILED":
                if (data.status === 401) {
                    !checkLoginStatus() && sessionTimeout.set(true);
                }
                return;

            case "DROP_SAVE":
                // dropResultHandler(data.id, 200);
                dropItems.set(
                    get(dropItems).map((item) => {
                        item.id === data.id && (item.progress = "success");
                        return item;
                    })
                );
                return;

            case "DROP_SAVE_COMPLETE":
                refreshImgs();
                fetchFiles(get(activeParentId), "covers", 3, true);
                return;

            case "DROP_SAVE_FAILED":
                // dropResultHandler(data.id, data.status);
                dropItems.set(
                    get(dropItems).map((item) => {
                        item.id === data.id && (item.progress = "failure");
                        return item;
                    })
                );
                if (data.status === 401) {
                    !checkLoginStatus() && sessionTimeout.set(true);
                }
                return;

            case "IMG_DELETE":
                selectAll.set(false);
                editProgress.set(false);
                refreshImgs();
                fetchFiles(get(activeParentId), "covers", 3, true);
                return;

            case "MOVE_IMGS":
                refreshImgs();
                fetchFiles(data.parent, "imgs", 1000, true);
                fetchFiles(data.parent, "covers", 3, true);
                fetchFiles(get(activeParentId), "covers", 3, true);
                return;

            case "EDIT_IMGS":
                refreshMainContent(get(activeParentId), "imgs").then(() => {
                    editItems.set([]);
                    selectedCount.set(0);
                    mode.set("");
                    editMode.set(false);
                });
                return;

            case "IDB_RELOAD_REQUIRED":
                return;
        }
    };
}

function refreshImgs() {
    fetchFiles(get(activeParentId), "imgs", 1000, true).then(() =>
        refreshMainContent(get(activeParentId), "imgs").then(() => {
            editItems.set([]);
            selectedCount.set(0);
            mode.set("");
            editMode.set(false);
        })
    );
}

export async function setCacheName() {
    for (let key of await caches.keys()) {
        if (key.startsWith("krabs_data")) dataCacheName.set(key);
    }
}

export const updateRecents = (data?: { name: string; id: string }) => {
    let old =
        (JSON.parse(window.localStorage.getItem("recents")!) as {
            name: string;
            id: string;
        }[]) ?? [];
    if (old.length === 0 && !data) return;
    if (data) {
        if (old?.length === 10) {
            old.pop();
        }
        old = old.filter((item) => item.id !== data.id);
        old.unshift(data);
    }
    recents.set(old);
    window.localStorage.setItem("recents", JSON.stringify(old));
};

export const toggleColorMode = () => {
    const root = document.documentElement;
    let active = window.localStorage.getItem("krabColorScheme");
    const schemeEle = document.querySelector(
        ".color-scheme"
    ) as HTMLButtonElement;
    const lightEle = schemeEle.querySelector(".light-icon") as HTMLSpanElement;
    const darkEle = schemeEle.querySelector(".dark-icon") as HTMLSpanElement;
    active = active ?? "auto";
    switch (active) {
        case "light":
            window.localStorage.setItem("krabColorScheme", "auto");
            root.classList.toggle("dark");
            lightEle.style.visibility = "hidden";
            darkEle.style.visibility = "initial";
            schemeEle.ariaChecked = "false";
            return;
        case "dark":
            window.localStorage.setItem("krabColorScheme", "auto");
            root.classList.toggle("dark");
            darkEle.style.visibility = "hidden";
            lightEle.style.visibility = "initial";
            schemeEle.ariaChecked = "false";
            return;
        case "auto":
            const current = window.matchMedia("(prefers-color-scheme: dark")
                .matches
                ? "dark"
                : "light";
            if (current === "dark") {
                window.localStorage.setItem("krabColorScheme", "light");
                root.classList.toggle("dark");
                darkEle.style.visibility = "hidden";
                lightEle.style.visibility = "initial";
                schemeEle.ariaChecked = "true";
                return;
            } else {
                window.localStorage.setItem("krabColorScheme", "dark");
                root.classList.toggle("dark");
                lightEle.style.visibility = "hidden";
                darkEle.style.visibility = "initial";
                schemeEle.ariaChecked = "true";
                return;
            }
    }
};

export function checkSessionTimeout() {
    let time = Number(window.localStorage.getItem("expires")) - Date.now();
    time > 0 &&
        activeTimeout.set(
            setTimeout(() => {
                if (isTokenExpired()) {
                    sessionTimeout.set(true);
                } else checkSessionTimeout();
            }, time)
        );
}

export function isValidUrl(url: string) {
    try {
        new URL(url);
        return url;
    } catch (err) {
        return "";
    }
}

export function handleFavorites() {
    if (get(mode) === "favorites") {
        activeImgs.set(get(tempImgs)?.filter((img) => img.starred === true));
        activeDirs.set(get(tempDirs)?.filter((dir) => dir.starred === true));
        return;
    }
    activeImgs.set(get(tempImgs));
    activeDirs.set(get(tempDirs));
}

async function handleGoogleSignIn(tokenResponse: TokenResponse) {
    const name = encodeURIComponent("Pocket_#Drive");
    accessToken = tokenResponse.access_token;
    window.localStorage.setItem("token", accessToken);
    window.localStorage.setItem(
        "expires",
        String(Date.now() + tokenResponse.expires_in * 1000)
    );
    clearTimeout(get(activeTimeout));
    checkSessionTimeout();
    sessionTimeout.set(false);
    if (!window.localStorage.getItem("root")) {
        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?&pageSize=1&fields=files(id,name)&orderBy=createdTime`,
            {
                headers: { authorization: `Bearer ${accessToken}` },
            }
        );
        const { files } = await res.json();
        if (files.length !== 0) {
            window.localStorage.setItem("root", files[0].id);
        } else {
            const { id } = await createRootDir(accessToken);
            window.localStorage.setItem("root", id);
        }
    }
    if (get(isLoggedin)) return;
    isLoggedin.set(true);
    goto("/r");
}

function initClient() {
    client = window.google.accounts.oauth2.initTokenClient({
        client_id: PUBLIC_KRAB_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: handleGoogleSignIn,
    });
}
export function getOauthToken() {
    client.requestAccessToken();
}

export function isTokenExpired() {
    return Date.now() > Number(window.localStorage.getItem("expires"));
}

export const loadGSIScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const header = document.querySelector(".header") as HTMLDivElement;
    const gsiIfExists = header.querySelector(`script[src='${src}']`);
    if (gsiIfExists) header.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        initClient();
        // window.google.accounts.id.initialize({
        //     client_id: PUBLIC_KRAB_CLIENT_ID,
        //     nonce: PUBLIC_KRAB_NONCE_WEB,
        //     auto_select: false,
        //     callback: handleGoogleSignIn,
        // });
        // window.google.accounts.id.prompt();
        // window.google.accounts.id.renderButton(
        //     header.querySelector(".button__signin"),
        //     {
        //         type: "icon",
        //         shape: "circle",
        //         size: "medium",
        //     }
        // );
    };
    script.onerror = (e) => console.log(e);
    header.append(script);
};

export const colorPalette = {
    ChocolateIceCream: "#ac725e",
    OldBrickRed: "#d06b64",
    Cardinal: "#f83a22",
    WildStraberries: "#fa573c",
    MarsOrange: "#ff7537",
    YellowCab: "#ffad46",
    Spearmint: "#42d692",
    VernFern: "#16a765",
    Asparagus: "#7bd148",
    SlimeGreen: "#b3dc6c",
    DesertSand: "#fbe983",
    Macaroni: "#fad165",
    SeaFoam: "#92e1c0",
    Pool: "#9fe1e7",
    Denim: "#9fc6e7",
    RainySky: "#4986e7",
    BlueVelvet: "#9a9cff",
    PurpleDino: "#b99aff",
    Mouse: "#8f8f8f",
    MountainGrey: "#cabdbf",
    Earthworm: "#cca6ac",
    BubbleGum: "#f691b2",
    PurpleRain: "#cd74e6",
    ToyEggplant: "#a47ae2",
};

export function checkLoginStatus() {
    if (browser) {
        return (
            Boolean(window.localStorage.getItem("token")) && !isTokenExpired()
        );
    }
}

export async function signUserOut(e?: Event) {
    e?.stopPropagation();
    await clearFiles();
    isLoggedin.set(false);
    console.log("logging user out");
    goto("/");
}

export async function clearFiles() {
    (await caches.keys()).forEach(
        (key) => key.startsWith("krabs") && caches.delete(key)
    );
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("expires");
}

export function handleTouchStart(e: TouchEvent) {
    if (e.touches.length >= 2) return;
    // e.stopPropagation();
    if (e.changedTouches.length === 0) return;
    const { screenX, screenY } = e.changedTouches[0];
    touchCoords.set({ startX: screenX, startY: screenY });
}
export function handleTouchEnd(e: TouchEvent, targetId: string | undefined) {
    if (!targetId) return;
    if (e.touches.length >= 2) return;
    // e.stopPropagation();
    if (e.changedTouches.length === 0) return;
    const { screenX, screenY } = e.changedTouches[0];
    touchCoords.set({ ...get(touchCoords), endX: screenX, endY: screenY });
    checkDirection(targetId);
}
export function handleTouchMove(e: TouchEvent) {
    if (e.touches.length >= 2) return;
    // e.preventDefault();
    // e.stopPropagation();
}
function checkDirection(targetId: string) {
    const { endX, endY, startX, startY } = get(touchCoords);
    if (endX && endY && startX && startY) {
        if (Math.abs(startX - endX) > 40) {
            //swipe left
            if (startX > endX) {
                previewChange(targetId, "NEXT");
                return;
            }
            //swipe right
            if (startX < endX) {
                previewChange(targetId, "PREV");
                return;
            }
        }
        if (Math.abs(startY - endY) > 40) {
            // swipe down
            if (startY < endY) {
                previewItem.set(undefined);
                return;
            }
            // swipe up
            if (startY > endY) {
                previewItem.set(undefined);
                return;
            }
        }
    }
}

export function fetchImgPreview(id: string) {
    const token = window.localStorage.getItem("token");

    childWorker.postMessage({
        context: "IMG_PREVIEW",
        id,
        token,
    });
}

export function previewChange(
    targetId: string | undefined,
    type: "PREV" | "NEXT"
) {
    if (!targetId) return;
    const imgs = document.querySelector(".imgs") as HTMLDivElement;
    const target = imgs.querySelector(`[data-id='${targetId}']`);
    const latestTarget = (
        type === "NEXT"
            ? target?.nextElementSibling
            : target?.previousElementSibling
    ) as HTMLDivElement;
    if (!latestTarget) return;

    const { id, url } = latestTarget.dataset as { id: string; url: string };
    const latestImg = latestTarget?.firstElementChild as HTMLImageElement;
    previewItem.set({ id, url, src: latestImg.src });
    if (url) return;

    fetchImgPreview(id);
}

export function previewShortcutHandler(e: KeyboardEvent) {
    let targetId = get(previewItem)!.id;
    if (!targetId) return;
    if (e.altKey || e.metaKey || e.ctrlKey) {
        return;
    }
    const preview = document.querySelector(".preview") as HTMLDivElement;
    if (preview.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    switch (e.key) {
        case "ArrowRight":
            previewChange(targetId, "NEXT");
            return;
        case "ArrowLeft":
            previewChange(targetId, "PREV");
            return;
        case "ArrowDown":
            previewItem.set(undefined);
            return;
        case "ArrowUp":
            const preview = document.querySelector(
                ".preview"
            ) as HTMLDivElement;
            preview.classList.toggle("preview-full");
            preview.classList.toggle("preview-half");
            return;
    }
}

export function setExtraInfo(items: DropItem[]) {
    const droppeditems = document.querySelector(
        ".drop-items"
    ) as HTMLDivElement;
    const commonUrl = (
        document.querySelector(".common-url") as HTMLInputElement
    ).value;
    const tempDirItems = [];
    for (let item of items) {
        if (item.progress === "success" || item.progress === "uploading")
            continue;
        const id = item.id;
        const dropItem = droppeditems.querySelector(
            `[data-id='${id}']`
        ) as HTMLDivElement;
        let dropImg = dropItem.querySelector(".drop-img") as HTMLImageElement;
        dropImg.classList.toggle("drop-item-uploading");
        let name = dropItem.querySelector(".name") as HTMLInputElement;
        item.name = name.value.trim();
        let url = dropItem.querySelector(".url") as HTMLInputElement;
        if (url.value.trim() !== "") {
            item.url = decodeURI(url.value.trim());
        } else {
            item.url = decodeURI(commonUrl.trim());
        }
        item.progress = "uploading";
        tempDirItems.push(item);
    }
    return tempDirItems;
}

export function removeDropEntry(id: string) {
    dropItems.set(get(dropItems).filter((item) => item.id !== id));
}

export function clearDropItems() {
    const a = get(dropItems).filter((item) => item.progress !== "success");
    dropItems.set(a);
}

export function dropOkHandlerSingle(id: string) {
    let items = get(dropItems).filter((item) => item.id === id);
    const [itemSingle] = setExtraInfo(items);
    items = get(dropItems).map((item) => {
        if (item.id === id) {
            return itemSingle;
        } else {
            return item;
        }
    });
    dropItems.set(items);
    const { pathname } = window.location;
    const parent =
        pathname === "/"
            ? window.localStorage.getItem("root")!
            : pathname.substring(1);
    const token = window.localStorage.getItem("token");
    childWorker.postMessage({
        context: "DROP_SAVE",
        dropItems: [itemSingle],
        parent,
        token,
    });
}

export function dropOkHandler() {
    clearDropItems();
    const tempDirItems = setExtraInfo(get(dropItems));
    const { pathname } = window.location;
    const parent =
        pathname === "/"
            ? window.localStorage.getItem("root")!
            : pathname.substring(1);
    const token = window.localStorage.getItem("token");
    childWorker.postMessage({
        context: "DROP_SAVE",
        dropItems: tempDirItems,
        parent,
        token,
    });
}

export function dropCloseHandler() {
    const running = get(dropItems).filter(
        (item) => item.progress === "uploading"
    );
    if (running.length === 0) {
        dropFull.set(false);
        dropItems.set([]);
        autosave.set(false);
    } else {
        dropMini.set(!get(dropMini));
        dropFull.set(false);
    }
}

export function previewAndSetDropItems(
    files: FileList,
    parent?: string,
    parentName?: string
) {
    for (let img of files!) {
        if (img.type.match("image/")) {
            // previewLoadDropItem(img, dropArea);
            // dropZone.hidden = false;
            const id = Math.round(Math.random() * Date.now()).toString();
            const imgRef = URL.createObjectURL(img);
            if (
                img.type === "image/gif" ||
                img.type === "image/avif" ||
                img.type === "image/webp"
            ) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result! as ArrayBuffer;
                    const bytes = new Uint8Array(result);
                    dropItems.set([
                        ...get(dropItems),
                        {
                            id,
                            name: id,
                            mimeType: img.type,
                            bytes,
                            imgRef,
                            parent: parent || get(activeParentId),
                            parentName: parentName || get(activeParentName),
                        },
                    ]);
                };
                reader.readAsArrayBuffer(img);
            } else {
                const image = new Image();
                const c = document.createElement("canvas");
                const ctx = c.getContext("2d");

                image.onload = function () {
                    c.width = this.naturalWidth; // update canvas size to match image
                    c.height = this.naturalHeight;
                    ctx.drawImage(this, 0, 0);
                    c.toBlob(async function (blob) {
                        const result =
                            (await blob?.arrayBuffer()) as ArrayBuffer;
                        const bytes = new Uint8Array(result);
                        const imgRef = URL.createObjectURL(blob);
                        dropItems.set([
                            ...get(dropItems),
                            {
                                id,
                                name: id,
                                mimeType: blob?.type!,
                                bytes,
                                imgRef,
                                parent: parent || get(activeParentId),
                                parentName: parentName || get(activeParentName),
                            },
                        ]);
                    }, "image/webp");
                };
                image.onerror = function () {
                    alert("Error in loading");
                };
                image.crossOrigin = ""; // if from different origin
                image.src = imgRef;
            }
        }
    }
}

export function shortcutHandler(e) {
    switch (e.key) {
        case "Delete":
            if (get(editMode) && get(editItems).length !== 0) {
                mode.set("delete");
                editConfirm.set(true);
            }
            break;
        case "Escape":
            if (get(editMode) && get(mode) === "select") {
                mode.set("");
                editMode.set(false);
                selectedCount.set(0);
                selectAll.set(false);
                editItems.set([]);
            }
            if (get(mode) === "edit") {
                editConfirm.set(false);
                mode.set("select");
            }
            if (get(mode) === "delete") {
                editConfirm.set(false);
                mode.set("select");
            }
            if (get(mode) === "search") {
                mode.set("");
            }
            if (get(dropItems).length !== 0) {
                dropMini.set(true);
                dropFull.set(false);
                autosave.set(false);
            }
            get(dirCreateToggle) && dirCreateToggle.set(false);
            get(previewItem) && previewItem.set(undefined);
            break;

        case "a":
            if (get(dropItems).length !== 0) {
                dropMini.set(!get(dropMini));
                dropFull.set(false);
            }
            break;
        case "E":
            editMode.set(!get(editMode));
            get(editMode) === true ? mode.set("select") : mode.set("");
            break;
        case "e":
            if (get(editMode)) {
                get(editItems).length !== 0 && mode.set("edit");
            } else {
                dirCreateToggle.set(true);
            }
            break;
        case "c":
            if (get(editMode)) {
                get(editItems).length !== 0 && mode.set("move");
            }
            break;
        case "s":
            if (!get(editMode)) {
                mode.set("search");
                globalSearch.set(false);
                if (e.shiftKey) globalSearch.set(true);
            }
            break;
        case "S":
            if (!get(editMode)) {
                mode.set("search");
                globalSearch.set(true);
            }
            break;
        case "r":
            if (e.altKey) {
                refreshCache();
                favoritesActive.set(false);
                reverseActive.set(false);
            }
            break;
        case "R":
            reverseActive.set(!get(reverseActive));
            activeDirs.set(get(activeDirs)?.reverse());
            activeImgs.set(get(activeImgs)?.reverse());
            break;
        case "D":
            favoritesActive.set(!get(favoritesActive));
            mode.set(get(mode) === "favorites" ? "" : "favorites");
            handleFavorites();
            break;
        case "ArrowRight":
        case "ArrowLeft":
        case "ArrowDown":
        case "ArrowUp":
            if (get(previewItem)) {
                previewShortcutHandler(e);
            }
            break;
        default:
            break;
    }
}
