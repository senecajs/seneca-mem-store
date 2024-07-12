type Options = {
    map?: any;
    prefix?: string;
    idlen?: number;
    web?: {
        dump: boolean;
    };
    generate_id?: any;
    'entity-id-exists': string;
};
declare function mem_store(this: any, options: Options): {
    name: string;
    tag: any;
    exportmap: {
        native: any;
    };
};
declare namespace mem_store {
    var preload: (this: any) => {
        name: string;
        exportmap: {
            native: () => void;
        };
    };
    var defaults: {
        map: import("gubu").Node<{}>;
        prefix: string;
        idlen: number;
        web: {
            dump: boolean;
        };
        merge: boolean;
        generate_id: import("gubu").Node<FunctionConstructor>;
        'entity-id-exists': string;
    };
    var intern: typeof import("./intern").intern;
}
export default mem_store;
