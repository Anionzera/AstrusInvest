import os
import sys
import json
import datetime as dt
from typing import Any, Dict

import requests


BASE_URL = os.environ.get("ASTRUS_API", "http://localhost:5000").rstrip("/")


def post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    r = requests.post(BASE_URL + path, json=payload, timeout=60)
    print("POST", path, r.status_code)
    print(r.text)
    r.raise_for_status()
    return r.json()


def get(path: str) -> Dict[str, Any]:
    r = requests.get(BASE_URL + path, timeout=60)
    print("GET", path, r.status_code)
    print(r.text)
    r.raise_for_status()
    return r.json()


def main() -> int:
    clients = get("/api/clients").get("data", [])
    if not clients:
        print("Nenhum cliente encontrado. Cadastre um cliente antes do teste.")
        return 1
    client_id = clients[0]["id"]
    print("CLIENT:", client_id)

    issue = dt.date.today().replace(day=1).isoformat()
    maturity = (dt.date.today().replace(day=1) + dt.timedelta(days=365)).isoformat()

    # CDB PRE bullet
    inst_pre = post(
        "/api/fixed-income/instruments",
        {
            "kind": "CDB",
            "issuer": "Master",
            "indexer": "PRE",
            "rate": 0.135,
            "face_value": 1000.0,
            "issue_date": issue,
            "maturity_date": maturity,
            "daycount": "BUS/252",
            "amortization": "BULLET",
        },
    )["id"]
    pos_pre = post(
        "/api/fixed-income/positions",
        {
            "instrument_id": inst_pre,
            "client_id": client_id,
            "trade_date": issue,
            "quantity": 3.0,
            "price": 1000.0,
        },
    )["id"]
    val_pre = get(f"/api/fixed-income/valuation?position_id={pos_pre}")
    print("VAL_PRE_JSON", json.dumps(val_pre, indent=2, ensure_ascii=False))

    # IPCA PRICE (CRI)
    inst_ipca = post(
        "/api/fixed-income/instruments",
        {
            "kind": "CRI",
            "issuer": "Corp",
            "indexer": "IPCA",
            "rate": 0.06,
            "face_value": 1000.0,
            "issue_date": issue,
            "maturity_date": maturity,
            "daycount": "BUS/252",
            "amortization": "PRICE",
            "ipca_lag_months": 2,
        },
    )["id"]
    pos_ipca = post(
        "/api/fixed-income/positions",
        {
            "instrument_id": inst_ipca,
            "client_id": client_id,
            "trade_date": issue,
            "quantity": 2.0,
            "price": 1000.0,
        },
    )["id"]
    val_ipca = get(f"/api/fixed-income/valuation?position_id={pos_ipca}")
    print("VAL_IPCA_JSON", json.dumps(val_ipca, indent=2, ensure_ascii=False))

    # MTM consolidado
    asof = dt.date.today().isoformat()
    mtm = get(f"/api/fixed-income/mtm/portfolio?client_id={client_id}&date={asof}")
    print("MTM_JSON", json.dumps(mtm, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


