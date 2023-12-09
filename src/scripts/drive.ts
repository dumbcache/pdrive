import { get } from "svelte/store";
import {
    activeDirs,
    activeImgs,
    activeParentId,
    dataCacheName,
    recents,
    refreshClicked,
    searchItems,
    sessionTimeout,
} from "./stores";
import { colorPalette, checkLoginStatus } from "./utils";

export const DIR_MIME_TYPE = "application/vnd.google-apps.folder";
export const IMG_MIME_TYPE = "image/";
export const FILE_API = "https://www.googleapis.com/drive/v3/files";
export const FIELDS_REQUIRED =
    "files(id,name,description,appProperties(origin),thumbnailLink,starred)";

export const wait = (s: number) => new Promise((res) => setTimeout(res, s));

function constructAPI(
    parent: string,
    mimeType: string,
    pageSize?: number,
    pageToken?: string
) {
    let api = `${FILE_API}?q='${parent}' in parents and mimeType contains '${mimeType}'&fields=${FIELDS_REQUIRED}&pageSize=${pageSize}`;
    pageToken && (api = api + `&pageToken=` + pageToken);
    api =
        `${api}&orderBy=` +
        (mimeType === DIR_MIME_TYPE ? "name" : "createdTime desc");
    return api;
}
// export async function downloadImage(id: string, token: string): Promise<Blob> {
//     return new Promise(async (resolve, reject) => {
//         let res = await fetch(`${FILE_API}/${id}?alt=media`, {
//             method: "GET",
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//         });
//         if (res.status !== 200) {
//             if (res.status === 401) reject({ status: 401 });
//             reject({ status: res.status });
//         }
//         const data = await res.blob();
//         resolve(data);
//     });
// }
export async function searchHandler(token: string, search: string) {
    const res = await fetch(
        FILE_API +
            `?q=mimeType contains '${DIR_MIME_TYPE}' and name contains '${search}'&pageSize=1000&fields=${FIELDS_REQUIRED}&orderBy=createdTime desc`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    const { status, statusText } = res;
    if (status !== 200) {
        console.log(
            `error while creating root dir ${status} ${statusText}`,
            await res.json()
        );
        if (status === 401) {
            get(sessionTimeout) === false && sessionTimeout.set(true);
            return;
        }
    }
    searchItems.set((await res.json()).files);
}

export const createRootDir = async (accessToken: string) => {
    let req = await fetch(FILE_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            name: "Pocket_#Drive",
            mimeType: "application/vnd.google-apps.folder",
            folderColorRgb: colorPalette.Cardinal,
            description: "",
        }),
    });
    let { status, statusText } = req;
    let data = (await req.json()) as CreateResourceResponse;
    if (status !== 200)
        console.log(
            `error while creating root dir ${status} ${statusText}`,
            data
        );
    return data;
};

export const createDir = async (
    name: string,
    parent: string,
    token: string
): Promise<any> => {
    const url = "https://www.googleapis.com/drive/v3/files/";
    let req = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parent],
        }),
    });
    let { status, statusText } = req;
    let data = (await req.json()) as CreateResourceResponse;
    if (status !== 200) {
        console.log(
            `error while creating root dir ${status} ${statusText}`,
            data
        );
        if (status === 401) {
            get(sessionTimeout) === false && sessionTimeout.set(true);
            return;
        }
    }
    let old = get(activeDirs) ?? [];
    old = [...old, { name: data.name, id: data.id }];
    activeDirs.set(old.sort((a, b) => a.name.localeCompare(b.name)));
    fetchFiles(parent, "dirs", 1000, true);
};

export const updateDir = async (
    name: string,
    id: string,
    parent: string,
    token: string
): Promise<any> => {
    const { status, data } = await updateResource(id, { name }, token);
    if (status !== 200) {
        return;
    }
    let old = get(activeDirs)?.filter((img) => img.id !== id) ?? [];
    old = [...old, { name: data.name, id: data.id }];
    activeDirs.set(old.sort((a, b) => a.name.localeCompare(b.name)));
    fetchFiles(parent, "dirs", 1000, true);
};

export const getResource = async (id: string): Promise<GoogleFile> => {
    let res = await fetch(`${FILE_API}/${id}?fields=id,name,parents`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
        },
    });
    let { status, statusText } = res;
    let data = (await res.json()) as CreateResourceResponse;
    if (status !== 200) {
        console.log(
            `error while updating resource ${status} ${statusText}`,
            data
        );
        if (res.status === 401) {
            get(sessionTimeout) === false && sessionTimeout.set(true);
            return;
        }
        return;
    }
    return data;
};

export const updateResource = async (
    id: string,
    imgMeta: ImgMeta,
    token: string
): Promise<any> => {
    const url = `https://www.googleapis.com/drive/v3/files/${id}`;
    let req = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(imgMeta),
    });
    let { status, statusText } = req;
    let data = (await req.json()) as CreateResourceResponse;
    if (status !== 200) {
        console.log(
            `error while updating resource ${status} ${statusText}`,
            data
        );
        if (status === 401) {
            get(sessionTimeout) === false && sessionTimeout.set(true);
            return;
        }
        return status;
    }
    return { status, data };
};

export const deleteDir = async (
    id: string,
    parent: string,
    token: string
): Promise<any> => {
    const url = `https://www.googleapis.com/drive/v3/files/${id}`;
    let req = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    let { status, statusText } = req;
    if (status !== 204) {
        console.log(
            `error while deleting root dir ${status} ${statusText}`,
            await req.text()
        );
        if (status === 401) {
            get(sessionTimeout) === false && sessionTimeout.set(true);
            return;
        }
    }
    let old = get(activeDirs)?.filter((img) => img.id !== id) ?? [];
    old.length === 0 ? activeDirs.set(undefined) : activeDirs.set(old);
    fetchFiles(parent, "dirs", 1000, true);
};

export const createImgMetadata = (
    imgMeta: ImgMeta,
    token: string
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const url =
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
        let req = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(imgMeta),
        });
        let { status, statusText } = req;
        if (status !== 200) {
            console.log(
                `error while creatingImgMetaData ${status} ${statusText}`
            );
            reject({ status });
        }
        resolve(req.headers.get("Location")!);
    });
};

// export const uploadImg = async (
//     location: string,
//     bytes: Uint8Array
//     // mimeType: string
// ) => {
//     let req = await fetch(location, {
//         method: "PUT",
//         // headers: {
//         //     "Content-Type": mimeType,
//         // },
//         body: bytes,
//     });
//     let { status, statusText } = req;
//     if (status !== 200) {
//         console.log(`error while uploadingImg ${status} ${statusText}`);
//         return { status };
//     }
//     return { status };
// };

export async function fetchFiles(
    parent: string,
    type: "dirs" | "imgs" | "covers",
    pageSize: number = 1000,
    cache: Boolean = false
): Promise<GoogleFileRes | undefined> {
    try {
        // if (!pageSize) {
        //     pageSize = mimeType === DIR_MIME_TYPE ? 1000 : 100;
        // }
        let mimeType = type == "dirs" ? DIR_MIME_TYPE : IMG_MIME_TYPE;
        const token = window.localStorage.getItem("token");
        const req = new Request(constructAPI(parent, mimeType, pageSize), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (cache) await (await caches.open(get(dataCacheName))).delete(req);
        return new Promise(async (resolve, reject) => {
            let res = await fetch(req);
            if (res.status !== 200) {
                if (res.status === 401) {
                    reject({ status: 401 });
                    return;
                }
                reject({ status: res.status });
                return;
            }
            resolve(res.json());
        });
    } catch (error) {
        console.warn(error);
    }
}

export function localFetch(url: string, krabsCache: Cache) {
    return krabsCache.match(url);
}

export async function refreshCache() {
    if (!checkLoginStatus()) {
        sessionTimeout.set(true);
        return;
    }
    refreshClicked.set(true);
    window.localStorage.setItem("recents", "[]");
    recents.set([]);
    for (const key of await caches.keys()) {
        if (key === get(dataCacheName)) await caches.delete(key);
    }
    refreshMainContent(get(activeParentId)).then(() => {
        refreshClicked.set(false);
    });
}

export async function fetchDirs(
    parent: string,
    cache: Boolean = false
): Promise<void> {
    activeDirs.set(undefined);
    return new Promise((resolve, reject) => {
        fetchFiles(parent!, "dirs", 1000, cache)
            .then(async (dirs) => {
                activeDirs.set(dirs?.files);
                if (cache) {
                    for (let dir of dirs!.files) {
                        fetchFiles(dir.id, "covers", 3, cache);
                    }
                }
                resolve();
                return;
            })
            .catch((status) => reject(status));
    });
}
export async function fetchImgs(
    parent: string,
    cache: Boolean = false
): Promise<void> {
    activeImgs.set(undefined);
    return new Promise((resolve, reject) => {
        fetchFiles(parent!, "imgs", 1000, cache)
            .then(async (imgs) => {
                activeImgs.set(imgs?.files);
                resolve();
                return;
            })
            .catch((status) => reject(status));
    });
}

export const refreshMainContent = (
    parent: string,
    type?: "dirs" | "imgs"
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const proms: Promise<void>[] = [];
        switch (type) {
            case "dirs":
                proms.push(fetchDirs(parent, true));
                break;
            case "imgs":
                proms.push(fetchImgs(parent, true));
                break;
            default:
                proms.push(fetchDirs(parent, true), fetchImgs(parent, true));
                break;
        }

        Promise.all(proms)
            .then(() => {
                resolve();
            })
            .catch(async (e) => {
                if (e.status === 401) {
                    get(sessionTimeout) === false && sessionTimeout.set(true);
                    return;
                }
                console.warn(e);
            });
    });
};

export const loadMainContent = (parent: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const proms = [fetchDirs(parent!), fetchImgs(parent!)];
        Promise.all(proms)
            .then(() => {
                resolve();
            })
            .catch(async (e) => {
                console.warn(e);
                if (e.status === 401) {
                    get(sessionTimeout) === false && sessionTimeout.set(true);
                    return;
                }
            });
    });
};
