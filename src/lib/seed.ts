import "server-only";
import { getDB, mutate, newId, type Employee } from "@/lib/db";

/**
 * Alta inicial del equipo (usuarios del NAS). Se ejecuta UNA vez: si aún no
 * hay empleados y no se ha sembrado antes. Los nombres se toman de la lista de
 * usuarios del NAS; el administrador puede ajustar el usuario/correo en
 * Personal si alguno no coincide con su login exacto del NAS.
 */
const ROSTER: Array<{ username: string; nombre: string; rol?: string }> = [
  { username: "Alix Pantoja", nombre: "Alix Pantoja" },
  { username: "Alix Santander", nombre: "Alix Santander" },
  { username: "Barbara", nombre: "Barbara" },
  { username: "Dante Chávez", nombre: "Dante Chávez" },
  { username: "ivonneflores", nombre: "Ivonne Flores" },
  { username: "Urani", nombre: "Urani" },
];

export async function seedInitialEmployees(): Promise<void> {
  const db = await getDB();
  if (db.seededEmployees || db.employees.length > 0) return;
  await mutate((d) => {
    if (d.seededEmployees || d.employees.length > 0) return;
    for (const r of ROSTER) {
      const emp: Employee = {
        id: newId("EMP"),
        username: r.username,
        nombre: r.nombre,
        email: "",
        rol: r.rol || "",
        ranking: 0,
        habilidades: [],
        proyectoId: null,
        createdAt: Date.now(),
      };
      d.employees.push(emp);
    }
    d.seededEmployees = true;
  });
}
