import type { Database as Generated } from "./database.types";

// Columnas que pone la base con triggers al insertar (029 multi-tenant y
// numeración por clínica): la app nunca las envía, así que en Insert son
// opcionales aunque la columna sea NOT NULL sin default.
type SetByDb = "clinic_id" | "receipt_number" | "record_number";

type PublicTables = Generated["public"]["Tables"];

type WithDbColumns<T> = Omit<T, SetByDb & keyof T> &
  Partial<Pick<T, SetByDb & keyof T>>;

export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Tables"> & {
    Tables: {
      [K in keyof PublicTables]: Omit<PublicTables[K], "Insert"> & {
        Insert: WithDbColumns<PublicTables[K]["Insert"]>;
      };
    };
  };
};
