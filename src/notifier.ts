import path from "path";
import {Notification} from "electron";
import open from "open";

export function showPendingNotification (courseName) {
    const notification = {
        title: courseName,
        icon: path.join(__dirname, '../', "media", 'icon.png'),
        body: "Materials are being fetched!"
    }
    new Notification(notification).show()
}

export function showCompletedNotification(numberOfDownloads, courseName, folderPath) {
    const notification = new Notification({
        title: courseName,
        body: `${numberOfDownloads} files downloaded! \nClick to open folder`,
    })
    notification.on('click', async (event)=>{
        await open(folderPath)
    })
    notification.show()
}


export function showAllNotification(folderPath, updates: {[key:string]: number}) {
    let body = "There are some new materials for: \n"
    body += Object.keys(updates).filter(x => updates[x] > 0).join(", ")
    body += "\nClick to open folder"

    const notification = new Notification({
        title: "New Materials",
        body: body,
    })
    notification.on('click', async (event)=>{
        await open(folderPath)
    })
    notification.show()
}

export function showErrorNotification() {
    const notification = new Notification({
        title: "Something went wrong!",
        body: "Oops something went wrong! Please try again later",
    })
    notification.show()
}

export function showNoShortcutsMessage() {
    const notification = new Notification({
        title: "No Shortcuts!",
        body: "No shortcuts could be found, please make sure materials is installed and shortcuts have been added!",
    })
    notification.show()
}
