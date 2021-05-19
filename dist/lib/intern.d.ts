export declare function is_new(ent: any): boolean;
export declare function is_upsert_requested(msg: any): boolean;
export declare function find_ent(entmap: any, base_ent: any, filter: any): any;
export declare function update_ent(entmap: any, base_ent: any, filter: any, new_attrs: any): any;
export declare function should_merge(ent: any, plugin_opts: any): boolean;
export declare function listents(seneca: any, entmap: any, qent: any, q: any, done: any): void;
export declare function clean_array(ary: string[]): string[];
