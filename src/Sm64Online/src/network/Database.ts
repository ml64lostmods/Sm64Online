export class FileData {
    save_data: Buffer = Buffer.alloc(0x70);
    star_count = 0;
}

export class Database {
    file: FileData[] = Array<FileData>(3);

    constructor() {
        this.file[0] = new FileData();
        this.file[1] = new FileData();
        this.file[2] = new FileData();
        this.file[3] = new FileData();
    }
}

export class DatabaseClient extends Database {
    curScn: number = -1;
}

export class DatabaseServer extends Database {
    // Puppets
    playerInstances: any = {};
    players: any = {};
}