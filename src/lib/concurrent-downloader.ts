import MaterialsLegacy from "./materials-legacy";
import {Resource, ResourceWithLink} from "../utils/resource";
import path from "path";
import fs from "fs";
import {downloadURL} from "./link-downloader";

class ConcurrentDownloader {

    materialsLegacy: MaterialsLegacy;
    course: string;
    folderPath: string;
    tasks: any[] = [];


    constructor(materialsLegacy: MaterialsLegacy, course: string, folderPath: string) {
        this.materialsLegacy = materialsLegacy;
        this.course = course;
        this.folderPath = folderPath;
    }

    async scheduleDownloads(resources: Resource[]) {
        for (let i = 0; i < resources.length; i++) {
            let currentResource = resources[i];
            const filePath = path.join(this.folderPath, this.course, currentResource.category, currentResource.title)
            if (!fs.existsSync(filePath)) {
                this.tasks.push(this.materialsLegacy.downloadFile(currentResource, currentResource.index, this.folderPath, this.course));
            }

        }
    }

    scheduleLinkDownloads(resources: ResourceWithLink[]) {
        for (let i = 0; i < resources.length; i++) {
            let currentResource = resources[i];
            const filePath = path.join(this.folderPath, this.course, currentResource.category, currentResource.title + ".pdf")
            if (!fs.existsSync(filePath)) {
                this.tasks.push(downloadURL(this.folderPath, this.course, currentResource))
            }
        }
    }

    async executeDownloads() {
        const numToDownload = this.tasks.length;
        if (numToDownload !== 0) {
            await Promise.all(this.tasks)
            return numToDownload;
        } else {
            return 0;
        }
    }

}

export default ConcurrentDownloader;
