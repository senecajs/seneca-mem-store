declare let internals: {
    name: string;
};
declare function mem_store(options: any): {
    name: string;
    tag: any;
    exportmap: {
        native: any;
    };
};
declare function listents(seneca: any, entmap: any, qent: any, q: any, done: any): void;
