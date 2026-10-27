#!/usr/bin/env python3
"""
Importador de administración de Cobalto Barroco.

Lee el Excel de ADMINISTRACIÓN (hojas OBRAS, NÓMINA, INDIRECTOS, UTILIDADES,
IMPUESTOS, ADQUISICIONES) y el de NÓMINA operativa, y produce el JSON para la
sección Administración de la plataforma. Se sube con el botón "Importar
catálogos (JSON)" (admin → Costos y P.U.).

El JSON lleva `"mode": "admin"`: el endpoint reemplaza los gastos y la nómina DE
EMPRESA (projectId null) por lo del archivo y deja intactos los movimientos de
cada obra. Así la carga es idempotente (re-importar no duplica) y NO toca
materiales/recetas/salarios (esas claves no se incluyen).

Claves de salida: projects, ledgerEntries (egresos de empresa), payrollEntries.

Uso:
    python import-admin.py --admin ADMIN.xlsx [--nomina NOMINA.xlsx] --out admin-seed.json

Mapeo:
  OBRAS         → projects (montos por obra; tablas 2025 y 2026)
  NÓMINA        → payrollEntries   (subcats: nómina/aguinaldo/externo/proveedores)
  INDIRECTOS    → ledgerEntries    categoria="indirectos"   (licencias/servicios/viáticos/otros)
  IMPUESTOS     → ledgerEntries    categoria="impuestos"    (IVA/ISR/anual)
  ADQUISICIONES → ledgerEntries    categoria="adquisiciones"(material/herramienta/equipo)
  UTILIDADES    → ledgerEntries    categoria="utilidades"   (reparto a socios)
  Nómina operativa (workbook aparte) → payrollEntries por quincena

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
    """Id determinista para que el upsert sea idempotente entre corridas.
    Se basa solo en campos estables (hoja + subcat + nombre + monto + fecha);
    NO depende del formato del concepto, para no cambiar entre versiones."""
    h = hashlib.md5("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()
    return f"{prefix}-{h[:8].upper()}"


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def clean(v):
    return re.sub(r"\s+", " ", str(v).strip()) if v is not None else ""


def parse_fecha(v):
    """YYYY-MM-DD o '' si no se interpreta."""
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    if is_num(v):
        m = re.match(r"^(\d{4})\.(\d{1,2})$", s)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-01"
        return ""
    m = re.match(r"^(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})$", s)
    if m:
        y = int(m.group(1)) + (2000 if int(m.group(1)) < 100 else 0)
        mo = min(max(int(m.group(2)), 1), 12)
        d = min(max(int(m.group(3)), 1), 31)
        return f"{y:04d}-{mo:02d}-{d:02d}"
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
def import_obras(ws):
    out = []
    for r in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
        periodo = clean(cell(r, "A"))
        nombre = clean(cell(r, "C"))
        tipo = clean(cell(r, "D"))
        total = cell(r, "E")
        if not nombre or not is_num(total):
            continue
        if nombre.upper() in {"CLIENTE", "TOTAL"} or tipo.upper() == "TIPO":
            continue
        if not re.match(r"^\d{4}", periodo):
            continue
        anio = int(periodo[:4])
        f, j, k = cell(r, "F"), cell(r, "J"), cell(r, "K")
        out.append({
            "id": hid("OBRA", nombre, clean(cell(r, "B")), periodo),
            "nombre": nombre,
            "ubicacion": clean(cell(r, "B")),
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


# ── Hojas con BLOQUES paralelos: (col_fecha, col_concepto, col_monto) ─────────
# Subcategoría en la fila 5 (col_concepto); datos desde la fila 6.
BLOCKS = [("B", "D", "E"), ("G", "I", "J"), ("L", "N", "O"), ("Q", "S", "T")]


def import_bloques(ws, kind, categoria):
    rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
    if len(rows) < 6:
        return []
    row5 = rows[4]
    out = []
    for cf, cc, cm in BLOCKS:
        subcat = clean(cell(row5, cc))
        if not subcat or subcat.upper() == "EGRESOS ADMINISTRATIVOS":
            continue
        for r in rows[5:]:
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
                    "nota": "",
                    "createdAt": NOW,
                })
            else:
                out.append({
                    "id": hid("LED", ws.title, subcat, nombre, monto, fecha),
                    "projectId": None,
                    "fecha": fecha,
                    "categoria": categoria,
                    "subcategoria": subcat,
                    "tipo": "egreso",
                    "concepto": nombre,
                    "monto": round(float(monto), 2),
                    "createdAt": NOW,
                })
    return out


# ── Nómina operativa (columnas distintas por hoja) ───────────────────────────
NOMINA_SHEETS = {
    "27-JUN": (4, "C", "F", "B"),
    "13-JUN": (4, "C", "F", "B"),
    "23-MAY": (3, "A", "B", None),
    "ADEUDOS": (2, "A", "B", "C"),
}


def import_nomina_operativa(wb):
    out = []
    for s in wb.sheetnames:
        cfg = NOMINA_SHEETS.get(s.strip().upper())
        if not cfg:
            continue
        r0, cp, cm, cobra = cfg
        ws = wb[s]
        for r in list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))[r0 - 1:]:
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
                "nota": f"NÓMINA_JUN {s.strip()}" + (f" · {obra}" if obra else ""),
                "createdAt": NOW,
            })
    return out


def main():
    ap = argparse.ArgumentParser(description="Importa administración a JSON.")
    ap.add_argument("--admin", required=True)
    ap.add_argument("--nomina")
    ap.add_argument("--out", default="admin-seed.json")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.admin, data_only=True, read_only=True)
    projects = import_obras(sheet(wb, "OBRAS"))
    payroll = import_bloques(sheet(wb, "NÓMINA"), "payroll", None)
    ledger = []
    ledger += import_bloques(sheet(wb, "ADQUISICIONES"), "ledger", "adquisiciones")
    ledger += import_bloques(sheet(wb, "IMPUESTOS"), "ledger", "impuestos")
    ledger += import_bloques(sheet(wb, "INDIRECTOS"), "ledger", "indirectos")
    ledger += import_bloques(sheet(wb, "UTILIDADES"), "ledger", "utilidades")
    wb.close()

    if args.nomina:
        wb2 = openpyxl.load_workbook(args.nomina, data_only=True, read_only=True)
        payroll += import_nomina_operativa(wb2)
        wb2.close()

    seed = {
        "mode": "admin",
        "projects": projects,
        "ledgerEntries": ledger,
        "payrollEntries": payroll,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=2)

    bycat = {}
    for e in ledger:
        bycat[e["categoria"]] = bycat.get(e["categoria"], 0) + 1
    print(f"  proyectos:  {len(projects)}")
    print(f"  gastos:     {len(ledger)}  {bycat}")
    print(f"  nómina:     {len(payroll)}")
    print(f"Seed escrito en {args.out}")


if __name__ == "__main__":
    main()
