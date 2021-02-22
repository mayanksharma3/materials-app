import Configstore from "configstore";
import {Course} from "../utils/course";

class ConfigStore {

    conf: Configstore;

    constructor(id: string) {
        this.conf = new Configstore(id);
    }

    getFolderPath(): string | undefined {
        return this.conf.has("folderPath") ? this.conf.get("folderPath"): undefined
    }

    setFolderPath(folderPath: string) {
        this.conf.set("folderPath", folderPath)
    }

    clearConfig() {
        this.conf.clear()
    }

    getCourses(): Courses {
        return this.conf.get("courses") || []
    }


    setCourses(courses: Course[]) {
        this.conf.set("courses", courses);
    }

}

export type Courses = Course[];

export default ConfigStore;
