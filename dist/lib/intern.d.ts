export declare class intern {
    static is_new(ent: any): boolean;
    static is_upsert_requested(msg: any): boolean;
    static find_mement(entmap: any, base_ent: any, filter: any): any;
    static update_mement(entmap: any, base_ent: any, filter: any, new_attrs: any): any;
    static should_merge(ent: any, plugin_opts: any): boolean;
    static listents(seneca: any, entmap: any, qent: any, q: any, done: any): void;
    static clean_array(ary: string[]): string[];
}
