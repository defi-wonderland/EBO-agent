export class BlockmetaConnectionFailed extends Error {
    constructor() {
        super(`Could not establish connection to blockmeta.`);

        this.name = "BlockmetaConnectionFailed";
    }
}
