export interface EboRegistryCommand {
    /**
     * Run a command to update the registry
     */
    run(): void;

    /**
     * Undo a command that has been run
     */
    undo(): void;
}
