#!/usr/bin/env python3
"""
Importador de administración de Cobalto Barroco.

Lee los Excel de administración y nómina y produce un JSON listo para la
plataforma (claves `projects`, `ledgerEntries`, `payrollEntries`), que se sube
con el botón "Importar catálogos (JSON)" (admin → Costos y P.U.). El endpoint
`/api/costos/import` hace UPSERT por id de esas tres colecciones, así que
re-importar actualiza en vez de duplicar y NO toca materiales, recetas ni
salarios (esas claves no se incluyen a propósito).

Fuentes:
  Workbook ADMINISTRACIÓN (01_ADMINISTRACIÓN_2026.xlsx):
    - hoja `OBRAS`         → projects      (obras 2025 y 2026, con montos)
    - hoja `NÓMINA`        → payrollEntries (empresa: nómina/aguinaldo/externo/proveedores)
    - hoja `ADQUISICIONES` → ledgerEntries (egreso, material/herramienta/equipo)
    - hoja `IMPUESTOS`     → ledgerEntries (egreso, IVA/ISR/anual)
    - hoja `INDIRECTOS`    → ledgerEntries (egreso, licencias/servicios/viáticos/otros)
  Workbook NÓMINA (NÓMINA_2026_JUN.xlsx):
    - hojas por quincena   → payrollEntries (operativa, por obra)

Uso:
    python import-admin.py --admin RUTA_ADMIN.xlsx --nomina RUTA_NOMINA.xlsx --out admin-seed.json

Tipos: ver `src/lib/db.ts` (Project, LedgerEntry, PayrollEntry).
"""
import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, date

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl. Instala con: pip install openpyxl")

from openpyxl.utils import column_index_from_string as col_i

NOW = int(time.time() * 1000)


def hid(prefix, *parts):
    """Id determinista (estable entre corridas) para que el upsert no duplique."""
    h = hashlib.md5("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()
    return f"{prefix}-{h[:8].upper()}"


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def clean(v):
    return re.sub(r"\s+", " ", str(v).strip()) if v is not None else ""


def parse_fecha(v):
    """Devuelve YYYY-MM-DD o '' si no se puede interpretar."""
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    # Flotante tipo 2026.05 (año.mes)
    if is_num(v):
        m = re.match(r"^(\d{4})\.(\d{1,2})$", s)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-01"
        return ""
    # YYYY.MM.DD  /  YY.MM.DD  (también con . - /)
    m = re.match(r"^(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})$", s)
    if m:
        y = int(m.group(1))
        if y < 100:
            y += 2000
        mo = min(max(int(m.group(2)), 1), 12)
        d = min(max(int(m.group(3)), 1), 31)
        return f"{y:04d}-{mo:02d}-{d:02d}"
    # YYYY.MM
    m = re.match(r"^(\d{4})[.\-/](\d{1,2})$", s)
    if m:
        return f"{int(m.group(1)):04d}-{min(max(int(m.group(2)),1),12):02d}-01"
    return ""


def cell(row, letter):
    i = col_i(letter) - 1
    return row[i] if 0 <= i < len(row) else None


def sheet(wb, name):
    for s in wb.sheetnames:
        if s.strip().upper() == name.strip().upper():
            return wb[s]
    raise SystemExit(f"No hay hoja '{name}'. Hojas: {wb.sheetnames}")


# ── OBRAS → projects ─────────────────────────────────────────────────────────
# Dos tablas (2025 y 2026) con el mismo encabezado:
#   A periodo | B ubicación | C cliente/obra | D tipo | E total | F anticipo
#   G/H pagos | I total recibido | J egresos | K final(utilidad)
def import_obras(ws):
    out = []
    rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
    for r in rows:
        periodo = clean(cell(r, "A"))
        ubic = clean(cell(r, "B"))
        nombre = clean(cell(r, "C"))
        tipo = clean(cell(r, "D"))
        total = cell(r, "E")
        # Fila de obra válida: tiene nombre y un total numérico, y A parece período.
        if not nombre or not is_num(total):
            continue
        if nombre.upper() in {"CLIENTE", "TOTAL"} or tipo.upper() == "TIPO":
            continue
        if not re.match(r"^\d{4}", periodo):  # A debe empezar con un año (2025.* / 2026 / 2026.ENE)
            continue
        anio = int(periodo[:4])
        f = cell(r, "F"); j = cell(r, "J"); k = cell(r, "K")
        out.append({
            "id": hid("OBRA", nombre, ubic, periodo),
            "nombre": nombre,
            "ubicacion": ubic,
            "inicio": "",
            "entrega": "",
            "avance": 0,
            "estado": "activo" if anio >= 2026 else "finalizado",
            "desc": f"Importado de OBRAS ({periodo}).",
            "cliente": nombre,
            "tipo": tipo.lstrip("*").strip(),
            "montoTotal": round(float(total), 2),
            "anticipo": round(float(f), 2) if is_num(f) else 0,
            "egresos": round(float(j), 2) if is_num(j) else 0,
            "utilidad": round(float(k), 2) if is_num(k) else 0,
            "createdAt": NOW,
        })
    return out


# ── Hojas de egresos con BLOQUES en paralelo ─────────────────────────────────
# Cada bloque = (col_fecha, col_concepto, col_monto). El nombre de la
# subcategoría está en la fila 5 (col_concepto); los datos empiezan en la fila 6.
BLOCKS = [("B", "D", "E"), ("G", "I", "J"), ("L", "N", "O"), ("Q", "S", "T")]


def import_bloques(ws, kind, categoria):
    """kind: 'ledger' | 'payroll'. Devuelve lista de entradas."""
    rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
    if len(rows) < 6:
        return []
    row5 = rows[4]
    out = []
    for cf, cc, cm in BLOCKS:
        subcat = clean(cell(row5, cc))
        if not subcat:
            continue
        for r in rows[5:]:  # desde la fila 6
            nombre = clean(cell(r, cc))
            monto = cell(r, cm)
            if not nombre or not is_num(monto) or float(monto) == 0:
                continue
            if nombre.upper() == "EGRESOS ADMINISTRATIVOS":
                continue
            fecha = parse_fecha(cell(r, cf))
            if kind == "payroll":
                out.append({
                    "id": hid("PAY", ws.title, subcat, nombre, monto, fecha),
                    "projectId": None,
                    "persona": nombre,
                    "rol": "",
                    "periodo": fecha or subcat,
                    "fecha": fecha,
                    "categoria": subcat.lower(),
                    "monto": round(float(monto), 2),
                    "pagado": True,
                    "nota": "Importado de ADMINISTRACIÓN/NÓMINA.",
                    "createdAt": NOW,
                })
            else:
                out.append({
                    "id": hid("LED", ws.title, subcat, nombre, monto, fecha),
                    "projectId": None,
                    "fecha": fecha,
                    "categoria": categoria,
                    "tipo": "egreso",
                    "concepto": f"{subcat}: {nombre}",
                    "monto": round(float(monto), 2),
                    "createdAt": NOW,
                })
    return out


# ── Workbook de NÓMINA operativa (columnas distintas por hoja) ───────────────
# Config por hoja: (fila_inicio, col_persona, col_monto, col_obra|None)
NOMINA_SHEETS = {
    "27-JUN": (4, "C", "F", "B"),   # F = PROGRAMACIÓN PAGO
    "13-JUN": (4, "C", "F", "B"),   # F = PROGRAMACIÓN 13-JUN
    "23-MAY": (3, "A", "B", None),  # A persona, B monto
    "ADEUDOS": (2, "A", "B", "C"),  # adeudos sueltos
}


def import_nomina_operativa(wb):
    out = []
    for s in wb.sheetnames:
        key = s.strip().upper()
        cfg = next((v for k, v in NOMINA_SHEETS.items() if k == key), None)
        if not cfg:
            continue
        r0, cp, cm, cobra = cfg
        ws = wb[s]
        rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
        for r in rows[r0 - 1:]:
            persona = clean(cell(r, cp))
            monto = cell(r, cm)
            if not persona or not is_num(monto) or float(monto) == 0:
                continue
            if persona.upper() in {"GTO", "PBA", "SNCRIS", "CASA LAGO", "MUNAL", "ADEUDO", "TOTAL"}:
                continue
            obra = clean(cell(r, cobra)) if cobra else ""
            out.append({
                "id": hid("PAY", "NOMJUN", s.strip(), persona, monto),
                "projectId": None,
                "persona": re.sub(r"\s*\(.*?\)\s*", "", persona).strip(),
                "rol": obra,
                "periodo": s.strip(),
                "fecha": "",
                "categoria": "nómina operativa",
                "monto": round(float(monto), 2),
                "pagado": True,
                "nota": f"Importado de NÓMINA_JUN ({s.strip()})" + (f", obra {obra}" if obra else ""),
                "createdAt": NOW,
            })
    return out


def main():
    ap = argparse.ArgumentParser(description="Importa administración a JSON.")
    ap.add_argument("--admin", required=True, help="Excel de ADMINISTRACIÓN.")
    ap.add_argument("--nomina", help="Excel de NÓMINA operativa (opcional).")
    ap.add_argument("--out", default="admin-seed.json")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.admin, data_only=True, read_only=True)
    projects = import_obras(sheet(wb, "OBRAS"))
    payroll = import_bloques(sheet(wb, "NÓMINA"), "payroll", None)
    ledger = []
    ledger += import_bloques(sheet(wb, "ADQUISICIONES"), "ledger", "adquisiciones")
    ledger += import_bloques(sheet(wb, "IMPUESTOS"), "ledger", "impuestos")
    ledger += import_bloques(sheet(wb, "INDIRECTOS"), "ledger", "indirectos")
    wb.close()

    if args.nomina:
        wb2 = openpyxl.load_workbook(args.nomina, data_only=True, read_only=True)
        payroll += import_nomina_operativa(wb2)
        wb2.close()

    seed = {"projects": projects, "ledgerEntries": ledger, "payrollEntries": payroll}
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=2)

    print(f"  proyectos:  {len(projects)}")
    print(f"  gastos:     {len(ledger)}  (egresos administrativos)")
    print(f"  nómina:     {len(payroll)}  (empresa + operativa)")
    print(f"Seed escrito en {args.out}")


if __name__ == "__main__":
    main()
