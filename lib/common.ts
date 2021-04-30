// NOTE: This function removes any props containing $.
//
export function clean(what: string[] | { [prop: string]: any }): string[] | { [prop: string]: any } {
  if (Array.isArray(what)) {
    return cleanArray(what)
  }

  return cleanObject(what)


  function cleanArray(ary: string[]): string[] {
    return ary.filter(x => !isPrivateProp(x))
  }

  function cleanObject(obj: { [prop: string]: any }): { [prop: string]: any } {
    const out: { [prop: string]: any } = {}

    const public_props = Object.getOwnPropertyNames(what)
      .filter(p => !isPrivateProp(p))

    for (const p of public_props) {
      out[p] = obj[p]
    }

    return out
  }

  function isPrivateProp(prop: string) : boolean {
    return prop.includes('$')
  }
}

