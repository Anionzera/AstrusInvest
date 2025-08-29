from flask import Blueprint, request, jsonify
from datetime import datetime
import unicodedata
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from db.session import get_session
from models.fixed_income import Instrument, PositionFI
from services.fixed_income_valuation import (
    price_bullet_pre,
    price_cdb_cdi,
    price_cdb_selic,
    price_ipca_bullet,
    price_ipca_amortized,
)
from datetime import timedelta
from services.data_sources.indexer_service import service as indexers
from services.fixed_income_valuation import _business_day_list
from services.calendar_service import calendar252


fi_bp = Blueprint("fixed_income", __name__, url_prefix="/api/fixed-income")


def _strip_accents_upper(text: str) -> str:
    if not text:
        return ""
    # remove diacritics and uppercase
    nfkd = unicodedata.normalize("NFKD", str(text))
    without = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return without.upper().strip()


def _normalize_indexer(indexer: str) -> str:
    idx = _strip_accents_upper(indexer)
    if idx in ("PRE", "PREFIX", "PREFIXADO", "PRE-FIXADO", "PREF", "PRE_FIXADO", "PREÇO"):  # last is unlikely but safe
        return "PRE"
    if idx in ("CDI", "DI"):
        return "CDI"
    if idx in ("SELIC",):
        return "SELIC"
    if idx in ("IPCA", "IPCA+", "IPCA MAIS", "IPCA_MAIS", "IPCA+ "):
        return "IPCA"
    return idx


def _normalize_kind(kind: str) -> str:
    k = _strip_accents_upper(kind)
    # common aliases
    if k in ("DEB", "DEBENTURE", "DEBENTURES"):
        return "DEBENTURE"
    if k in ("LF", "LFS", "LFSN", "LETRA FINANCEIRA", "LETRA FINANCEIRA SENIOR", "LETRA FINANCEIRA SENIOR", "LETRA FINANCEIRA SENIOR "):
        return "LFSN"
    return k


@fi_bp.route("/instruments", methods=["POST"])
def create_instrument():
    payload = request.get_json(force=True)
    try:
        with get_session() as s:  # type: Session
            inst = Instrument(
                kind=payload["kind"],
                issuer=payload["issuer"],
                indexer=payload.get("indexer"),
                rate=payload.get("rate"),
                daycount=payload.get("daycount", "BUS/252"),
                business_convention=payload.get("business_convention"),
                ipca_lag_months=payload.get("ipca_lag_months"),
                face_value=payload["face_value"],
                issue_date=datetime.fromisoformat(payload["issue_date"]).date(),
                maturity_date=datetime.fromisoformat(payload["maturity_date"]).date() if payload.get("maturity_date") else None,
                grace_days=payload.get("grace_days"),
                amortization=payload.get("amortization", "BULLET"),
                schedule=payload.get("schedule"),
                tax_regime=payload.get("tax_regime"),
            )
            s.add(inst)
            s.commit()
            return jsonify({"success": True, "id": str(inst.id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@fi_bp.route("/positions", methods=["POST"])
def create_position():
    payload = request.get_json(force=True)
    try:
        # Validação simples
        if not payload.get("instrument_id"):
            return jsonify({"success": False, "error": "instrument_id is required (UUID)"}), 400
        if not payload.get("client_id"):
            return jsonify({"success": False, "error": "client_id is required (UUID)"}), 400
        if not payload.get("trade_date"):
            return jsonify({"success": False, "error": "trade_date is required (YYYY-MM-DD)"}), 400
        if payload.get("quantity") is None or payload.get("price") is None:
            return jsonify({"success": False, "error": "quantity and price are required"}), 400
        with get_session() as s:  # type: Session
            pos = PositionFI(
                instrument_id=payload["instrument_id"],
                client_id=payload["client_id"],
                trade_date=datetime.fromisoformat(payload["trade_date"]).date(),
                quantity=payload["quantity"],
                price=payload["price"],
            )
            s.add(pos)
            s.commit()
            return jsonify({"success": True, "id": str(pos.id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@fi_bp.route("/positions", methods=["GET"])
def list_positions():
    client_id = request.args.get("client_id")
    instrument_id = request.args.get("instrument_id")
    try:
        with get_session() as s:  # type: Session
            stmt = select(PositionFI)
            if client_id:
                stmt = stmt.where(PositionFI.client_id == client_id)
            if instrument_id:
                stmt = stmt.where(PositionFI.instrument_id == instrument_id)
            rows = s.execute(stmt).scalars().all()
            data = []
            for r in rows:
                inst = s.get(Instrument, r.instrument_id)
                inst_dict = None
                display_name = None
                if inst is not None:
                    rate = float(inst.rate or 0)
                    idx = _normalize_indexer(inst.indexer or "")
                    kind_norm = _normalize_kind(inst.kind or "")
                    if idx in ("CDI", "SELIC"):
                        rate_str = f"{(rate if rate > 2 else rate*100):.2f}%" if rate > 2 else f"{rate*100:.2f}%"
                        display_name = f"{kind_norm} {idx} {rate_str} - {inst.issuer}"
                    elif idx in ("IPCA", "PRE"):
                        rate_str = f"{rate*100:.2f}% a.a."
                        name_idx = "IPCA+" if idx == "IPCA" else "Pré"
                        display_name = f"{kind_norm} {name_idx} {rate_str} - {inst.issuer}"
                    else:
                        display_name = f"{kind_norm} - {inst.issuer}"
                    inst_dict = {
                        "id": str(inst.id),
                        "kind": kind_norm,
                        "issuer": inst.issuer,
                        "indexer": idx,
                        "rate": float(inst.rate or 0),
                        "face_value": float(inst.face_value or 0),
                        "issue_date": inst.issue_date.isoformat() if inst.issue_date else None,
                        "maturity_date": inst.maturity_date.isoformat() if inst.maturity_date else None,
                        "ipca_lag_months": int(inst.ipca_lag_months or 0) if inst.ipca_lag_months is not None else None,
                        "daycount": inst.daycount,
                        "amortization": inst.amortization,
                        "tax_regime": inst.tax_regime,
                        "display_name": display_name,
                    }
                data.append({
                    "id": str(r.id),
                    "instrument_id": str(r.instrument_id),
                    "client_id": str(r.client_id),
                    "trade_date": r.trade_date.isoformat(),
                    "quantity": float(r.quantity),
                    "price": float(r.price),
                    "instrument": inst_dict,
                })
            return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@fi_bp.route("/positions/<position_id>", methods=["GET"])
def get_position(position_id: str):
    try:
        with get_session() as s:  # type: Session
            r = s.get(PositionFI, position_id)
            if not r:
                return jsonify({"success": False, "error": "not found"}), 404
            data = {
                "id": str(r.id),
                "instrument_id": str(r.instrument_id),
                "client_id": str(r.client_id),
                "trade_date": r.trade_date.isoformat(),
                "quantity": float(r.quantity),
                "price": float(r.price),
            }
            return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@fi_bp.route("/positions/<position_id>", methods=["DELETE"])
def delete_position(position_id: str):
    try:
        with get_session() as s:  # type: Session
            pos = s.get(PositionFI, position_id)
            if not pos:
                return jsonify({"success": False, "error": "not found"}), 404
            s.delete(pos)
            s.commit()
            return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@fi_bp.route("/mtm/portfolio", methods=["GET"])
def mtm_portfolio():
    client_id = request.args.get("client_id")
    asof = request.args.get("date")
    from datetime import datetime as _dt
    asof_dt = _dt.fromisoformat(asof) if asof else _dt.utcnow()
    if not client_id:
        return jsonify({"success": False, "error": "client_id required"}), 400
    try:
        with get_session() as s:  # type: Session
            stmt = select(PositionFI).where(PositionFI.client_id == client_id)
            rows = s.execute(stmt).scalars().all()
            total_gross = 0.0
            total_tax = 0.0
            total_net = 0.0
            items = []
            for r in rows:
                inst = s.get(Instrument, r.instrument_id)
                idx = (inst.indexer or "").upper()
                kind_norm = _normalize_kind(inst.kind)
                idx = _normalize_indexer(inst.indexer or "")
                if kind_norm in ("CDB", "DEBENTURE", "LFSN") and idx in ("CDI", "SELIC"):
                    # Aproximação: usar preço atual via pós (dirty)
                    from services.fixed_income_valuation import price_cdb_cdi, price_cdb_selic
                    if idx == "CDI":
                        res = price_cdb_cdi(float(inst.face_value), float(inst.rate or 1.0), _dt.combine(inst.issue_date, _dt.min.time()), asof_dt)
                    else:
                        res = price_cdb_selic(float(inst.face_value), float(inst.rate or 1.0), _dt.combine(inst.issue_date, _dt.min.time()), asof_dt)
                    unit_dirty = float(res.dirty_price)
                    gross = unit_dirty * float(r.quantity)
                    taxes = 0.0
                    net = gross
                elif (kind_norm in ("LCI", "LCA", "CRI", "CRA") and idx == "IPCA") or (kind_norm in ("CDB", "DEBENTURE", "LFSN") and idx == "IPCA"):
                    from services.fixed_income_valuation import price_ipca_bullet, price_ipca_amortized
                    if inst.amortization and inst.amortization.upper() in ("PRICE", "SAC") and inst.maturity_date:
                        res = price_ipca_amortized(float(inst.face_value), float(inst.rate or 0.0), _dt.combine(inst.issue_date, _dt.min.time()), asof_dt, _dt.combine(inst.maturity_date, _dt.min.time()), inst.amortization.upper(), 1, int(inst.ipca_lag_months or 2))
                    else:
                        res = price_ipca_bullet(float(inst.face_value), float(inst.rate or 0.0), _dt.combine(inst.issue_date, _dt.min.time()), asof_dt, int(inst.ipca_lag_months or 2), daycount=inst.daycount or "BUS/252", maturity_date=_dt.combine(inst.maturity_date, _dt.min.time()) if inst.maturity_date else None)
                    unit_dirty = float(res.dirty_price)
                    gross = unit_dirty * float(r.quantity)
                    taxes = 0.0
                    net = gross
                else:
                    unit_dirty = float(r.price)
                    gross = unit_dirty * float(r.quantity)
                    taxes = 0.0
                    net = gross

                total_gross += gross
                total_tax += float(taxes)
                total_net += net
                items.append({
                    "position_id": str(r.id),
                    "instrument_id": str(inst.id),
                    "kind": kind_norm,
                    "indexer": idx,
                    "unit_dirty": unit_dirty,
                    "unit_clean": float(getattr(res, "clean_price", unit_dirty)),
                    "accrued": float(getattr(res, "accrued", 0.0)),
                    "ytm": float(getattr(res, "ytm", 0.0)) if getattr(res, "ytm", None) is not None else None,
                    "duration": float(getattr(res, "duration", 0.0)) if getattr(res, "duration", None) is not None else None,
                    "convexity": float(getattr(res, "convexity", 0.0)) if getattr(res, "convexity", None) is not None else None,
                    "gross": gross,
                    "tax": float(taxes),
                    "net": net,
                })

            return jsonify({
                "success": True,
                "client_id": client_id,
                "date": asof_dt.date().isoformat(),
                "totals": {"gross": total_gross, "tax": total_tax, "net": total_net},
                "items": items,
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@fi_bp.route("/valuation", methods=["GET"])
def valuation():
    position_id = request.args.get("position_id")
    asof = request.args.get("asof")
    if not position_id:
        return jsonify({"success": False, "error": "position_id required"}), 400
    try:
        asof_dt = datetime.fromisoformat(asof) if asof else datetime.utcnow()
        with get_session() as s:  # type: Session
            pos = s.get(PositionFI, position_id)
            if not pos:
                return jsonify({"success": False, "error": "position not found"}), 404
            inst = s.get(Instrument, pos.instrument_id)
            if not inst:
                return jsonify({"success": False, "error": "instrument not found"}), 404
            # Primeira entrega: CDB pré bullet (extensível para demais tipos)
            idx = _normalize_indexer(inst.indexer or "")
            kind = _normalize_kind(inst.kind or "")
            if kind in ("CDB", "LCI", "LCA", "CRI", "CRA", "DEBENTURE", "LFSN") and idx in ("PRE", ""):
                # Para títulos negociados por PU (não 1000), usar o preço de compra como base e a data de trade
                base_pu = float(pos.price)
                start_dt = datetime.combine(pos.trade_date, datetime.min.time())
                res = price_bullet_pre(
                    base_pu,
                    float(inst.rate or 0),
                    start_dt,
                    datetime.combine(inst.maturity_date, datetime.min.time()) if inst.maturity_date else asof_dt,
                    asof_dt,
                    inst.daycount or "BUS/252",
                )
                return jsonify({"success": True, **res.__dict__})
            if kind in ("CDB", "DEBENTURE", "LFSN") and idx in ("CDI", "SELIC"):
                if idx == "CDI":
                    res = price_cdb_cdi(
                        float(inst.face_value),
                        float(inst.rate or 1.0),
                        datetime.combine(inst.issue_date, datetime.min.time()),
                        asof_dt,
                    )
                    return jsonify({"success": True, **res.__dict__})
                if idx == "SELIC":
                    res = price_cdb_selic(
                        float(inst.face_value),
                        float(inst.rate or 1.0),
                        datetime.combine(inst.issue_date, datetime.min.time()),
                        asof_dt,
                    )
                    return jsonify({"success": True, **res.__dict__})
            # IPCA+: LCI/LCA/CRI/CRA e também CDB/Deb/LFSN IPCA+
            if (kind in ("LCI", "LCA", "CRI", "CRA") and idx == "IPCA") or (kind in ("CDB", "DEBENTURE", "LFSN") and idx == "IPCA"):
                try:
                    # Pré-carregar mapa IPCA para usar em múltiplos cálculos no loop
                    ipca_map_cache = indexers.get_ipca_number_index() if idx == "IPCA" else None
                    if inst.amortization and inst.amortization.upper() in ("PRICE", "SAC") and inst.maturity_date:
                        res = price_ipca_amortized(
                            float(inst.face_value or 0.0),
                            float(inst.rate or 0.0),
                            datetime.combine(inst.issue_date, datetime.min.time()),
                            asof_dt,
                            datetime.combine(inst.maturity_date, datetime.min.time()),
                            inst.amortization.upper(),
                            1,
                            int(inst.ipca_lag_months or 2),
                            inst.daycount or "BUS/252",
                            ipca_map_cache,
                        )
                    else:
                        res = price_ipca_bullet(
                            float(inst.face_value or 0.0),
                            float(inst.rate or 0.0),
                            datetime.combine(inst.issue_date, datetime.min.time()),
                            asof_dt,
                            int(inst.ipca_lag_months or 2),
                            inst.daycount or "BUS/252",
                            maturity_date=datetime.combine(inst.maturity_date, datetime.min.time()) if inst.maturity_date else None,
                            ipca_index_map=ipca_map_cache,
                        )
                    return jsonify({"success": True, **res.__dict__})
                except Exception as e:
                    return jsonify({"success": False, "error": f"ipca valuation error: {str(e)}"}), 500
            return jsonify({"success": False, "error": "instrument kind/indexer not supported yet"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@fi_bp.route("/valuation/bulk", methods=["POST"])
def valuation_bulk():
    """
    Valuation em lote para reduzir round-trips do PositionManager.
    Body: { positions: [{ id: str, asof?: 'YYYY-MM-DD' }] }
    Retorna: { success: true, data: { id -> valuation } }
    """
    try:
        payload = request.get_json(silent=True) or {}
        items = payload.get("positions") or []
        if not isinstance(items, list) or len(items) == 0:
            return jsonify({"success": False, "error": "positions required"}), 400
        results = {}
        with get_session() as s:  # type: Session
            for it in items:
                pid = it.get("id") if isinstance(it, dict) else None
                asof = it.get("asof") if isinstance(it, dict) else None
                if not pid:
                    continue
                try:
                    asof_dt = datetime.fromisoformat(asof) if asof else datetime.utcnow()
                    pos = s.get(PositionFI, pid)
                    if not pos:
                        results[pid] = {"success": False, "error": "position not found"}
                        continue
                    inst = s.get(Instrument, pos.instrument_id)
                    if not inst:
                        results[pid] = {"success": False, "error": "instrument not found"}
                        continue
                    idx = _normalize_indexer(inst.indexer or "")
                    kind = _normalize_kind(inst.kind or "")
                    if kind in ("CDB", "LCI", "LCA", "CRI", "CRA", "DEBENTURE", "LFSN") and idx in ("PRE", ""):
                        base_pu = float(pos.price)
                        start_dt = datetime.combine(pos.trade_date, datetime.min.time())
                        res = price_bullet_pre(base_pu, float(inst.rate or 0), start_dt, datetime.combine(inst.maturity_date, datetime.min.time()) if inst.maturity_date else asof_dt, asof_dt, inst.daycount or "BUS/252")
                        results[pid] = {"success": True, **res.__dict__}
                        continue
                    if kind in ("CDB", "DEBENTURE", "LFSN") and idx in ("CDI", "SELIC"):
                        if idx == "CDI":
                            res = price_cdb_cdi(float(inst.face_value), float(inst.rate or 1.0), datetime.combine(inst.issue_date, datetime.min.time()), asof_dt)
                            results[pid] = {"success": True, **res.__dict__}
                            continue
                        if idx == "SELIC":
                            res = price_cdb_selic(float(inst.face_value), float(inst.rate or 1.0), datetime.combine(inst.issue_date, datetime.min.time()), asof_dt)
                            results[pid] = {"success": True, **res.__dict__}
                            continue
                    if (kind in ("LCI", "LCA", "CRI", "CRA") and idx == "IPCA") or (kind in ("CDB", "DEBENTURE", "LFSN") and idx == "IPCA"):
                        ipca_map_cache = indexers.get_ipca_number_index() if idx == "IPCA" else None
                        if inst.amortization and inst.amortization.upper() in ("PRICE", "SAC") and inst.maturity_date:
                            res = price_ipca_amortized(float(inst.face_value or 0.0), float(inst.rate or 0.0), datetime.combine(inst.issue_date, datetime.min.time()), asof_dt, datetime.combine(inst.maturity_date, datetime.min.time()), inst.amortization.upper(), 1, int(inst.ipca_lag_months or 2), inst.daycount or "BUS/252", ipca_map_cache)
                        else:
                            res = price_ipca_bullet(float(inst.face_value or 0.0), float(inst.rate or 0.0), datetime.combine(inst.issue_date, datetime.min.time()), asof_dt, int(inst.ipca_lag_months or 2), inst.daycount or "BUS/252", maturity_date=datetime.combine(inst.maturity_date, datetime.min.time()) if inst.maturity_date else None, ipca_index_map=ipca_map_cache)
                        results[pid] = {"success": True, **res.__dict__}
                        continue
                    results[pid] = {"success": False, "error": "instrument kind/indexer not supported yet"}
                except Exception as e:
                    results[pid] = {"success": False, "error": str(e)}
        return jsonify({"success": True, "data": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@fi_bp.route("/valuation/timeseries", methods=["GET"])
def valuation_timeseries():
    position_id = request.args.get("position_id")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        with get_session() as s:  # type: Session
            pos = s.get(PositionFI, position_id)
            if not pos:
                return jsonify({"success": False, "error": "position not found"}), 404
            inst = s.get(Instrument, pos.instrument_id)
            if not inst:
                return jsonify({"success": False, "error": "instrument not found"}), 404
            from datetime import datetime as _dt
            start_dt = _dt.fromisoformat(start) if start else _dt.combine(pos.trade_date, _dt.min.time())
            end_dt = _dt.fromisoformat(end) if end else _dt.utcnow()
            if end_dt < start_dt:
                start_dt, end_dt = end_dt, start_dt

            idx = _normalize_indexer(inst.indexer or "")
            out = []
            # Iterar somente dias úteis B3 e ordenar
            bdays = sorted(_business_day_list(start_dt, end_dt))
            kind_norm = _normalize_kind(inst.kind)
            # Otimização: pré-calcular séries para CDI/SELIC evitando múltiplas chamadas à API
            if kind_norm in ("CDB", "DEBENTURE", "LFSN") and idx in ("CDI", "SELIC"):
                from services.fixed_income_valuation import _cdi_map, _selic_map
                face_val = float(inst.face_value)
                rate = float(inst.rate or 1.0)
                mult = rate / 100.0 if rate > 5 else rate
                issue_dt = _dt.combine(inst.issue_date, _dt.min.time())
                full_bdays = sorted(_business_day_list(issue_dt, end_dt))
                daily_map = _cdi_map(issue_dt, end_dt) if idx == "CDI" else _selic_map(issue_dt, end_dt)
                factor = 1.0
                prev_pv = face_val
                pv_by_day = {}
                accr_by_day = {}
                for dd in full_bdays:
                    key = dd.strftime('%d/%m/%Y')
                    r = daily_map.get(key)
                    if r is not None:
                        daily = 1.0 + (float(r) / 100.0) * mult
                        factor *= daily
                    pv = face_val * factor
                    accr = max(0.0, pv - prev_pv)
                    pv_by_day[dd.date().isoformat()] = pv
                    accr_by_day[dd.date().isoformat()] = accr
                    prev_pv = pv
                for d in bdays:
                    iso = d.date().isoformat()
                    if d < issue_dt:
                        pv = face_val
                        accr = 0.0
                    else:
                        pv = float(pv_by_day.get(iso, prev_pv))
                        accr = float(accr_by_day.get(iso, 0.0))
                    out.append({
                        "date": iso,
                        "dirty_price": pv,
                        "clean_price": pv - accr,
                        "accrued": accr,
                    })
                return jsonify({"success": True, "data": out})
            # pré-carregar mapa IPCA uma vez para a janela
            ipca_map_cache = indexers.get_ipca_number_index() if idx == "IPCA" else None
            # Caminho rápido para Pré (BUS/252): crescimento diário constante
            if idx in ("PRE", "") and kind_norm in ("CDB", "LCI", "LCA", "CRI", "CRA", "DEBENTURE", "LFSN") and str(inst.daycount or "BUS/252").upper().startswith("BUS/252"):
                base_pu = float(pos.price)
                annual = float(inst.rate or 0.0)
                g = pow(1.0 + annual, 1.0 / 252.0)
                # ajustar base para o início solicitado
                try:
                    pre_steps = max(0, calendar252.count_business_days(_dt.combine(pos.trade_date, _dt.min.time()), bdays[0]))
                except Exception:
                    pre_steps = 0
                prev = base_pu * pow(1.0 + annual, pre_steps / 252.0)
                first = True
                for d in bdays:
                    if first:
                        accrued = 0.0
                        pv = prev
                        first = False
                    else:
                        pv = prev * g
                        accrued = pv - prev
                    out.append({
                        "date": d.date().isoformat(),
                        "dirty_price": float(pv),
                        "clean_price": float(pv - accrued),
                        "accrued": float(accrued),
                    })
                    prev = pv
                return jsonify({"success": True, "data": out})

            # Caminho rápido IPCA+ (sem amortização): fator diário real × razão do índice entre dias
            if idx == "IPCA" and kind_norm in ("CDB", "DEBENTURE", "LFSN", "LCI", "LCA", "CRI", "CRA") and not (inst.amortization and inst.amortization.upper() in ("PRICE", "SAC")):
                lag = int(inst.ipca_lag_months or 2)
                face_val = float(inst.face_value or 0.0)
                real = float(inst.rate or 0.0)
                dc = str(inst.daycount or "BUS/252").upper()
                denom = 252.0 if dc.startswith("BUS/252") or dc in ("ACT/252", "ACT252") else (365.0 if dc in ("ACT/365", "ACT365F") else 252.0)
                g_real = pow(1.0 + real, 1.0 / denom)
                # PV do primeiro dia por fórmula geral, uma única chamada
                start_res = price_ipca_bullet(face_val, real, _dt.combine(inst.issue_date, _dt.min.time()), bdays[0], lag, daycount=inst.daycount or "BUS/252", maturity_date=_dt.combine(inst.maturity_date, _dt.min.time()) if inst.maturity_date else None, ipca_index_map=ipca_map_cache)
                pv_prev = float(getattr(start_res, "dirty_price", face_val))
                out.append({"date": bdays[0].date().isoformat(), "dirty_price": pv_prev, "clean_price": pv_prev, "accrued": 0.0})
                for i in range(1, len(bdays)):
                    prev = bdays[i-1]
                    cur = bdays[i]
                    i_prev = indexers.prorata_ipca(ipca_map_cache, prev, lag)
                    i_cur = indexers.prorata_ipca(ipca_map_cache, cur, lag)
                    if i_prev is None or i_cur is None or i_prev == 0:
                        # fallback: cálculo completo do dia
                        r = price_ipca_bullet(face_val, real, _dt.combine(inst.issue_date, _dt.min.time()), cur, lag, daycount=inst.daycount or "BUS/252", maturity_date=_dt.combine(inst.maturity_date, _dt.min.time()) if inst.maturity_date else None, ipca_index_map=ipca_map_cache)
                        pv_cur = float(getattr(r, "dirty_price", pv_prev))
                    else:
                        ratio_ipca = i_cur / i_prev
                        pv_cur = pv_prev * ratio_ipca * g_real
                    accrued = max(0.0, pv_cur - pv_prev)
                    out.append({"date": cur.date().isoformat(), "dirty_price": float(pv_cur), "clean_price": float(pv_cur - accrued), "accrued": float(accrued)})
                    pv_prev = pv_cur
                return jsonify({"success": True, "data": out})

            for d in bdays:
                # Demais caminhos
                if (kind_norm in ("LCI", "LCA", "CRI", "CRA") and idx == "IPCA") or (kind_norm in ("CDB", "DEBENTURE", "LFSN") and idx == "IPCA"):
                    if inst.amortization and inst.amortization.upper() in ("PRICE", "SAC") and inst.maturity_date:
                        res = price_ipca_amortized(float(inst.face_value), float(inst.rate or 0.0), _dt.combine(inst.issue_date, _dt.min.time()), d, _dt.combine(inst.maturity_date, _dt.min.time()), inst.amortization.upper(), 1, int(inst.ipca_lag_months or 2), inst.daycount or "BUS/252", ipca_map_cache)
                    else:
                        res = price_ipca_bullet(float(inst.face_value), float(inst.rate or 0.0), _dt.combine(inst.issue_date, _dt.min.time()), d, int(inst.ipca_lag_months or 2), daycount=inst.daycount or "BUS/252", maturity_date=_dt.combine(inst.maturity_date, _dt.min.time()) if inst.maturity_date else None, ipca_index_map=ipca_map_cache)
                else:
                    return jsonify({"success": False, "error": "instrument kind/indexer not supported for timeseries"}), 400
                out.append({
                    "date": d.date().isoformat(),
                    "dirty_price": float(getattr(res, "dirty_price", 0.0)),
                    "clean_price": float(getattr(res, "clean_price", 0.0)),
                    "accrued": float(getattr(res, "accrued", 0.0)),
                })
            return jsonify({"success": True, "data": out})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

