export declare class intern {
    static is_new(ent: any): boolean;
    static is_upsert(msg: any): boolean;
    static find_mement(entmap: any, base_ent: any, filter: any): any;
    static update_mement(entmap: any, base_ent: any, filter: any, new_attrs: any): any;
    static should_merge(ent: any, plugin_opts: any): boolean;
    static listents(seneca: any, entmap: any, qent: any, q: any, done: any): void;
    static clean_array(ary: string[]): string[];
    static is_object(x: any): boolean;
    static is_date(x: any): boolean;
    static eq_dates(lv: Date, rv: Date): boolean;
}
