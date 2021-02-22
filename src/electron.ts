import {app, BrowserWindow, ipcMain, Menu, Tray} from "electron";
import * as path from "path";
import open from "open";
import {
    showAllNotification,
    showCompletedNotification,
    showErrorNotification,
    showPendingNotification
} from "./notifier";
import fixPath from "fix-path";
import ConfigStore from "./lib/configstore";
import {id} from "./utils/config";
import MaterialsApi, {testAuth} from "./lib/materials-api";
import Keystore from "./lib/keystore";
import {Course} from "./utils/course";
import MaterialsLegacy from "./lib/materials-legacy";
import {Resource, ResourceWithLink} from "./utils/resource";
import ConcurrentDownloader from "./lib/concurrent-downloader";

const schedule = require('node-schedule');

fixPath();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 600,
        height: 450,
        frame: false,
        webPreferences: {
            nodeIntegration: true
        }
    })
    mainWindow.loadFile(path.join(__dirname, '../', 'site/index.html'))
    return mainWindow;
}

const keystore = new Keystore();
const conf = new ConfigStore(id);
const folderPath = conf.getFolderPath() || path.join(require("os").homedir(), "Documents", "Materials")
console.log(folderPath)
let tokenAndCredentials;

let tray = null
let trayMenuTemplate = null;

function toggleWindow() {
    win.isVisible() ? win.hide() : win.show()
    trayMenuTemplate[2].label = win.isVisible() ? "Close Window" : "Open Window"
    tray.setToolTip("Materials")
    const trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
    tray.setContextMenu(trayMenu)
}


function updateTray(courses: Course[]) {
    trayMenuTemplate = [
        {
            label: 'Open Folder',
            submenu: []
        },
        {
            label: 'Fetch Materials',
            submenu: []
        },
        {
            label: win.isVisible() ? "Close Window" : "Open Window",
            click: () => {
                toggleWindow();
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.quit()
            }
        }
    ]
    if (courses.length === 0) {
        trayMenuTemplate[0].submenu.push({
            label: "No courses",
            enabled: false
        })
        trayMenuTemplate[1].submenu.push({
            label: "No courses",
            enabled: false
        })
    } else {
        courses.forEach(course => {
            trayMenuTemplate[0].submenu.push({
                label: course.title,
                click: async function () {
                    await open(path.join(folderPath, course.title))
                }
            })
            trayMenuTemplate[1].submenu.push({
                label: course.title,
                click: async function () {
                    showPendingNotification(course.title)
                    try {
                        let existingCredentials = await keystore.getCredentials()

                        if (existingCredentials) {
                            const newToken = await testAuth(existingCredentials)
                            if (!newToken) {
                                win.show()
                                win.webContents.send("page", "login")
                            } else {
                                tokenAndCredentials = {credentials: existingCredentials, token: newToken}
                                const materialsLegacy = new MaterialsLegacy();
                                await materialsLegacy.authLegacy(tokenAndCredentials.credentials)
                                const numberOfDownloads = await downloadCourse(course, new MaterialsApi(tokenAndCredentials.token), materialsLegacy)
                                if (numberOfDownloads == -1) {
                                    showErrorNotification()
                                } else {
                                    showCompletedNotification(numberOfDownloads, course.title, path.join(folderPath, course.title))
                                }
                            }
                        } else {
                            win.show()
                            win.webContents.send("page", "login")
                        }

                    } catch (e) {
                        showErrorNotification()
                    }

                }
            })
        })
    }

    tray.setToolTip("Materials")
    const trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
    tray.setContextMenu(trayMenu)
}

let win: BrowserWindow;

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on("ready", async () => {
        win = createWindow();
        win.hide();
        if (process.platform === "darwin") {
            app.dock.hide();
        }
        if (process.platform === "win32") {
            win.setSkipTaskbar(true);
        }
        app.on("activate", function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        const credentials = await keystore.getCredentials()
        if (!credentials) {
            win.show()
        }

        const auth = await testAuth(credentials)
        if (!auth) {
            win.show()
        }

        tray = new Tray(path.join(__dirname, '../', "media", process.platform === "win32" ? "icon.ico" : 'materials@2x.png'))
        let courses = conf.getCourses();
        updateTray(courses);

    });
}

const job = schedule.scheduleJob('59 * * * *', async function () {
    try {
        let existingCredentials = await keystore.getCredentials()

        if (existingCredentials) {
            const newToken = await testAuth(existingCredentials)
            if (newToken) {
                tokenAndCredentials = {credentials: existingCredentials, token: newToken}
                const courses = conf.getCourses();
                const materialsLegacy = new MaterialsLegacy();
                await materialsLegacy.authLegacy(tokenAndCredentials.credentials)
                let sum = 0;
                for (let i = 0; i < courses.length; i++) {
                    sum += await downloadCourse(courses[i], new MaterialsApi(tokenAndCredentials.token), materialsLegacy)
                }
                if (sum > 0) {
                    showAllNotification(folderPath)
                }
            }
        }

    } catch (e) {
        console.log(e)
    }
});


ipcMain.on("auto-login", (async (event, args) => {
    let existingCredentials = await keystore.getCredentials()

    if (existingCredentials) {
        const newToken = await testAuth(existingCredentials)
        if (!newToken) {
            event.sender.send("page", "login");
        } else {
            tokenAndCredentials = {credentials: existingCredentials, token: newToken}
            event.sender.send("page", "courses");
        }
    } else {
        event.sender.send("page", "login");
    }

}))

ipcMain.on("login", async (event, data) => {
    const token = await testAuth(data)
    if (!token) {
        event.sender.send("login-response", false)
    } else {
        await keystore.setCredentials(data);
        tokenAndCredentials = {credentials: data, token: token}
        event.sender.send("page", "courses");
    }
})

ipcMain.on("fetchCourses", async (event, data) => {
    const materialsAPI = new MaterialsApi(tokenAndCredentials.token)
    const courses = await materialsAPI.getCourses()
    const coursesData = courses.data as Course[]
    const coursesConfig = conf.getCourses()
    const response = []
    for (let i = 0; i < coursesData.length; i++) {
        response[i] = coursesData[i]
        response[i].selected = coursesConfig.find(course => course.title === coursesData[i].title) !== undefined
    }

    event.sender.send("courses", response)
})

ipcMain.on("coursesSave", async (event, data) => {
    conf.setCourses(data)
    updateTray(data);
    event.sender.send("page", "end");
});

ipcMain.on("clearConfig", async (event, data) => {
    conf.clearConfig()
    await keystore.deleteCredentials()
    event.sender.send("page", "login");
});

ipcMain.on("closeWindow", async (event, data) => {
    win.hide()
});

export async function downloadCourse(course: Course, materialsAPI: MaterialsApi, materialsLegacy: MaterialsLegacy) {
    const resourcesResult = await materialsAPI.getCourseResources(course.code)
    // .map is a hack to ensure the extension is always added
    const nonLinkResources = resourcesResult.data.filter(x => x.type == 'file').map(x => {
        x.title = path.parse(x.title).name + path.parse(x.path).ext
        return x
    }) as Resource[]
    const pdfLinkResources = resourcesResult.data.filter(x => x.type == 'link' && x.path.endsWith(".pdf")) as ResourceWithLink[]
    const concurrentDownloader = new ConcurrentDownloader(materialsLegacy, course.title, folderPath)
    await concurrentDownloader.scheduleDownloads(nonLinkResources)
    concurrentDownloader.scheduleLinkDownloads(pdfLinkResources)
    return await concurrentDownloader.executeDownloads()
}
