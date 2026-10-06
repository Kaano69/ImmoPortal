/** Ergebnis einer Server Action, die direkt (ohne Formularzustand) aufgerufen wird. */
export type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };
