from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import pandas as pd
from services.arctic_service import get_arctic_service

from services.data_sources.indexer_service import service as indexers


indexers_bp = Blueprint("indexers", __name__, url_prefix="/api/timeseries")


@indexers_bp.route("/indexer", methods=["GET"])
def get_indexer():
    code = (request.args.get("code") or "").upper()
    start = request.args.get("start")
    end = request.args.get("end")

    try:
        if code == "CDI":
            data = indexers.get_cdi_daily(start or "2004-01-01", end or datetime.today().strftime("%Y-%m-%d"))
            return jsonify({"success": True, "code": code, "data": data})
        if code == "SELIC":
            data = indexers.get_selic_daily(start or "2004-01-01", end or datetime.today().strftime("%Y-%m-%d"))
            return jsonify({"success": True, "code": code, "data": data})
        if code == "CDI_12M":
            data = indexers.get_cdi_12m()
            return jsonify({"success": True, "code": code, "data": data})
        if code == "IPCA_INDEX":
            data = indexers.get_ipca_number_index()
            return jsonify({"success": True, "code": code, "data": data})
        return jsonify({"success": False, "error": "invalid code"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/ipca/daily", methods=["GET"])
def get_ipca_daily():
    date_str = request.args.get("date")
    lag = int(request.args.get("lag", "2"))
    if not date_str:
        return jsonify({"success": False, "error": "date required"}), 400
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        idx_map = indexers.get_ipca_number_index()
        val = indexers.prorata_ipca(idx_map, d, lag_months=lag)
        return jsonify({"success": True, "date": date_str, "index": val})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/ipca/index-map", methods=["GET"])
def get_ipca_index_map():
    try:
        data = indexers.get_ipca_number_index()
        # filtros opcionais
        start = request.args.get("start")  # YYYYMM
        end = request.args.get("end")      # YYYYMM
        limit = int(request.args.get("limit", "0") or 0)
        items = sorted(data.items(), key=lambda kv: kv[0])
        if start:
            items = [kv for kv in items if kv[0] >= start]
        if end:
            items = [kv for kv in items if kv[0] <= end]
        if limit and limit > 0:
            items = items[-limit:]
        return jsonify({"success": True, "count": len(items), "values": [{"month": k, "index": v} for k, v in items]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/prefetch", methods=["POST"])
def prefetch_indexers():
    body = request.get_json(silent=True) or {}
    start = body.get("start") or (datetime.today().replace(month=1, day=1).strftime("%Y-%m-%d"))
    end = body.get("end") or datetime.today().strftime("%Y-%m-%d")
    try:
        indexers.prefetch_range(start, end)
        return jsonify({"success": True, "start": start, "end": end})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/cache-all", methods=["POST"])
def cache_all_indexers():
    """Baixa CDI, SELIC (diário) e IPCA número‑índice e persiste no ArcticDB.
    Use start/end opcionais no body. Retorna contagem de linhas salvas.
    """
    body = request.get_json(silent=True) or {}
    start = body.get("start") or "2000-01-01"
    end = body.get("end") or datetime.utcnow().strftime("%Y-%m-%d")
    try:
        arctic = get_arctic_service()
        fmt = lambda d: d.strftime("%Y-%m-%d")
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)

        def add_years(d: datetime, years: int) -> datetime:
            try:
                return d.replace(year=d.year + years)
            except ValueError:
                # trata 29/02 -> 28/02
                return d.replace(month=2, day=28, year=d.year + years)

        def chunk_ranges(s: datetime, e: datetime, years_per_chunk: int = 9):
            cur = s
            out = []
            while cur <= e:
                nxt = add_years(cur, years_per_chunk)
                nxt_dt = nxt if nxt <= e else e
                out.append((fmt(cur), fmt(nxt_dt)))
                if nxt_dt >= e:
                    break
                cur = nxt_dt + timedelta(days=1)
            return out

        # CDI por janelas
        rows_cdi = 0
        try:
            parts = []
            for s_str, e_str in chunk_ranges(start_dt, end_dt, 9):
                try:
                    part = indexers.get_cdi_daily(s_str, e_str)
                    if isinstance(part, list):
                        parts.extend(part)
                except Exception:
                    continue
            df_cdi = pd.DataFrame(parts)
            if not df_cdi.empty:
                df_cdi["date"] = pd.to_datetime(df_cdi["data"], format="%d/%m/%Y", errors="coerce")
                df_cdi["value"] = pd.to_numeric(df_cdi["valor"].astype(str).str.replace(",", "."), errors="coerce")
                df_cdi = df_cdi.dropna(subset=["date","value"])[["date","value"]].drop_duplicates(subset=["date"]).sort_values("date")
                df_cdi.set_index("date", inplace=True)
                arctic.write_market_data("INDEXER_CDI_DAILY", df_cdi.rename(columns={"value": "cdi_d"}), metadata={"source": "SGS 12"}, tags=["indexer","cdi"])
                rows_cdi = int(df_cdi.shape[0])
        except Exception:
            pass

        # SELIC por janelas
        rows_selic = 0
        try:
            parts = []
            for s_str, e_str in chunk_ranges(start_dt, end_dt, 9):
                try:
                    part = indexers.get_selic_daily(s_str, e_str)
                    if isinstance(part, list):
                        parts.extend(part)
                except Exception:
                    continue
            df_slc = pd.DataFrame(parts)
            if not df_slc.empty:
                df_slc["date"] = pd.to_datetime(df_slc["data"], format="%d/%m/%Y", errors="coerce")
                df_slc["value"] = pd.to_numeric(df_slc["valor"].astype(str).str.replace(",", "."), errors="coerce")
                df_slc = df_slc.dropna(subset=["date","value"])[["date","value"]].drop_duplicates(subset=["date"]).sort_values("date")
                df_slc.set_index("date", inplace=True)
                arctic.write_market_data("INDEXER_SELIC_DAILY", df_slc.rename(columns={"value": "selic_d"}), metadata={"source": "SGS 11"}, tags=["indexer","selic"])
                rows_selic = int(df_slc.shape[0])
        except Exception:
            pass

        # IPCA número‑índice (mensal)
        rows_ipca = 0
        try:
            idx_map = indexers.get_ipca_number_index()
            arr = []
            for ym, val in sorted(idx_map.items()):
                try:
                    y = int(ym[:4]); m = int(ym[4:]);
                    arr.append({"date": datetime(y, m, 1), "value": float(val)})
                except Exception:
                    continue
            df_ipca = pd.DataFrame(arr)
            if not df_ipca.empty:
                df_ipca.set_index("date", inplace=True)
                arctic.write_market_data("INDEXER_IPCA_INDEX", df_ipca.rename(columns={"value": "ipca_index"}), metadata={"source": "SIDRA 1737 v2266"}, tags=["indexer","ipca"])
                rows_ipca = int(df_ipca.shape[0])
        except Exception:
            pass

        return jsonify({"success": True, "rows": {"cdi": rows_cdi, "selic": rows_selic, "ipca": rows_ipca}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/cache-cdi", methods=["POST"])
def cache_cdi_only():
    body = request.get_json(silent=True) or {}
    start = body.get("start") or "2024-01-01"
    end = body.get("end") or datetime.utcnow().strftime("%Y-%m-%d")
    try:
        arctic = get_arctic_service()
        cdi = indexers.get_cdi_daily(start, end)
        df = pd.DataFrame(cdi)
        if df.empty:
            return jsonify({"success": True, "rows": 0})
        df["date"] = pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce")
        df["value"] = pd.to_numeric(df["valor"].astype(str).str.replace(",", "."), errors="coerce")
        df = df.dropna(subset=["date","value"])[["date","value"]].drop_duplicates(subset=["date"]).sort_values("date")
        df.set_index("date", inplace=True)
        arctic.write_market_data("INDEXER_CDI_DAILY", df.rename(columns={"value": "cdi_d"}), metadata={"source": "SGS 12"}, tags=["indexer","cdi"])
        return jsonify({"success": True, "rows": int(df.shape[0])})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@indexers_bp.route("/cache-selic", methods=["POST"])
def cache_selic_only():
    body = request.get_json(silent=True) or {}
    start = body.get("start") or "2024-01-01"
    end = body.get("end") or datetime.utcnow().strftime("%Y-%m-%d")
    try:
        arctic = get_arctic_service()
        sel = indexers.get_selic_daily(start, end)
        df = pd.DataFrame(sel)
        if df.empty:
            return jsonify({"success": True, "rows": 0})
        df["date"] = pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce")
        df["value"] = pd.to_numeric(df["valor"].astype(str).str.replace(",", "."), errors="coerce")
        df = df.dropna(subset=["date","value"])[["date","value"]].drop_duplicates(subset=["date"]).sort_values("date")
        df.set_index("date", inplace=True)
        arctic.write_market_data("INDEXER_SELIC_DAILY", df.rename(columns={"value": "selic_d"}), metadata={"source": "SGS 11"}, tags=["indexer","selic"])
        return jsonify({"success": True, "rows": int(df.shape[0])})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

