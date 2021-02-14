import Configstore from "configstore";
import {Course} from "../utils/course";

class ConfigStore {

    conf: Configstore;

    constructor(id: string) {
        this.conf = new Configstore(id);
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
