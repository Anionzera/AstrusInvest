from dataclasses import dataclass
from datetime import datetime
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple

from financepy.products.bonds.bond import Bond
from financepy.utils.date import Date
from financepy.utils.day_count import DayCountTypes
from financepy.utils.calendar import CalendarTypes

from .data_sources.indexer_service import service as indexers
from . import data_sources
from services.arctic_service import get_arctic_service
from .calendar_service import calendar252

# Utilitários genéricos de fração de ano / YTM / duração
def _year_fraction(daycount: str, start: datetime, end: datetime) -> float:
    dc = (daycount or "BUS/252").upper()
    if dc.startswith("BUS/252"):
        try:
            bus = calendar252.count_business_days(start, end)
        except Exception:
            bus = (end - start).days
        return max(0.0, bus / 252.0)
    if dc in ("ACT/252", "ACT252"):
        return max(0.0, (end - start).days / 252.0)
    if dc in ("ACT/365", "ACT365F"):
        return max(0.0, (end - start).days / 365.0)
    # fallback
    return max(0.0, (end - start).days / 252.0)


def _solve_ytm_from_price(
    dirty_price: float,
    cashflows: List[Tuple[datetime, float]],
    asof: datetime,
    daycount: str = "BUS/252",
    lower: float = -0.99,
    upper: float = 5.0,
    tol: float = 1e-10,
    max_iter: int = 200,
) -> Optional[float]:
    """Resolve ytm anualizado (comp. simples) tal que PV(cashflows, y) = dirty_price.
    Usa bisseção robusta.
    """
    if dirty_price <= 0 or not cashflows:
        return None

    def pv(y: float) -> float:
        total = 0.0
        for dt, cf in cashflows:
            t = _year_fraction(daycount, asof, dt)
            if t < 0:
                continue
            total += cf / pow(1.0 + y, t)
        return total

    lo, hi = lower, upper
    pv_lo = pv(lo) - dirty_price
    pv_hi = pv(hi) - dirty_price
    # expandir intervalo se necessário
    expand = 0
    while pv_lo * pv_hi > 0 and expand < 8:
        lo = max(-0.999, lo - 0.5)
        hi = hi + 0.5
        pv_lo = pv(lo) - dirty_price
        pv_hi = pv(hi) - dirty_price
        expand += 1
    if pv_lo * pv_hi > 0:
        return None

    it = 0
    while it < max_iter:
        mid = 0.5 * (lo + hi)
        fmid = pv(mid) - dirty_price
        if abs(fmid) < tol:
            return mid
        if pv_lo * fmid <= 0:
            hi = mid
            pv_hi = fmid
        else:
            lo = mid
            pv_lo = fmid
        it += 1
    return 0.5 * (lo + hi)


def _duration_convexity(
    y: Optional[float],
    dirty_price: float,
    cashflows: List[Tuple[datetime, float]],
    asof: datetime,
    daycount: str = "BUS/252",
) -> Tuple[Optional[float], Optional[float], Dict[str, Any]]:
    if y is None or dirty_price <= 0 or not cashflows:
        return None, None, {"note": "no_yield_or_price"}
    # Macaulay / Modified duration e convexidade (aproximação discreta anual)
    pv_sum = 0.0
    w_t = 0.0
    w_conv = 0.0
    for dt, cf in cashflows:
        t = _year_fraction(daycount, asof, dt)
        if t < 0:
            continue
        df = pow(1.0 + y, t)
        pv_i = cf / df
        pv_sum += pv_i
        w_t += t * pv_i
        w_conv += t * (t + 1.0) * pv_i
    if pv_sum <= 0:
        return None, None, {"note": "zero_pv"}
    macaulay = w_t / pv_sum
    modified = macaulay / (1.0 + y)
    convexity = (w_conv / pv_sum) / pow(1.0 + y, 2.0)
    return modified, convexity, {"macaulay": macaulay}


def _map_daycount(name: str) -> DayCountTypes:
    n = (name or "BUS/252").upper()
    if n in ("BUS/252", "BUS-252", "BUS252", "BR_BUS_252"):
        # FinancePy não possui enum BUS_252; usamos ACT_252 e ajustamos fatores no traço
        return DayCountTypes.ACT_252
    if n in ("ACT/252", "ACT252"):
        return DayCountTypes.ACT_252
    if n in ("ACT/365", "ACT365F"):
        return DayCountTypes.ACT_365F
    if n in ("30/360", "30-360"):
        return DayCountTypes.THIRTY_360
    return DayCountTypes.ACT_252


@dataclass
class ValuationResult:
    clean_price: float
    dirty_price: float
    accrued: float
    ytm: Optional[float]
    duration: Optional[float]
    convexity: Optional[float]
    trace: Dict[str, Any]


def _ir_regressivo(days: int) -> float:
    if days <= 180:
        return 0.225
    if days <= 360:
        return 0.20
    if days <= 720:
        return 0.175
    return 0.15


_IOF_FACTORS = [
    0.96, 0.93, 0.90, 0.86, 0.83, 0.80, 0.76, 0.73, 0.70, 0.66,
    0.63, 0.60, 0.56, 0.53, 0.50, 0.46, 0.43, 0.40, 0.36, 0.33,
    0.30, 0.26, 0.23, 0.20, 0.16, 0.13, 0.10, 0.06, 0.03, 0.00
]


def estimate_taxes_cdb(trade_date: datetime, asof: datetime, unit_cost: float, unit_dirty: float) -> Dict[str, float]:
    """Estimativa de impostos se resgatado em 'asof'. IR regressivo + IOF regressivo (<30 dias).
    Retorna dicionário com 'iof', 'ir', 'total'.
    """
    days = (asof - trade_date).days
    profit = max(0.0, unit_dirty - unit_cost)
    if profit <= 0:
        return {"iof": 0.0, "ir": 0.0, "total": 0.0}
    iof = 0.0
    if days < 30:
        iof = profit * _IOF_FACTORS[max(0, days - 1)]
    ir_rate = _ir_regressivo(days)
    ir = (profit - iof) * ir_rate
    return {"iof": max(0.0, iof), "ir": max(0.0, ir), "total": max(0.0, iof + ir)}


def _fp_date(d: datetime) -> Date:
    return Date(d.year, d.month, d.day)


def price_bullet_pre(face_value: float, rate_annual: float, issue_date: datetime, maturity_date: datetime, asof: datetime, daycount: str = "BUS/252") -> ValuationResult:
    # Valor "carregado" até a data as-of (PU sujo) usando a taxa contratada
    t_issue_asof = _year_fraction(daycount, issue_date, asof)
    dirty = face_value * pow(1.0 + (rate_annual or 0.0), max(0.0, t_issue_asof))
    clean = dirty  # zero-cupom: accrual=0

    # Cashflow no vencimento (face capitalizada da emissão até o vencimento)
    t_issue_mat = _year_fraction(daycount, issue_date, maturity_date)
    cf_mat = face_value * pow(1.0 + (rate_annual or 0.0), max(0.0, t_issue_mat))
    t_asof_mat = _year_fraction(daycount, asof, maturity_date)
    # YTM tal que PV(cf_mat) = dirty
    ytm = _solve_ytm_from_price(dirty, [(maturity_date, cf_mat)], asof, daycount=daycount)
    duration, convexity, extra = _duration_convexity(ytm, dirty, [(maturity_date, cf_mat)], asof, daycount)

    trace = {
        "t_issue_asof": t_issue_asof,
        "t_issue_mat": t_issue_mat,
        "t_asof_mat": t_asof_mat,
        "cf_mat": cf_mat,
        "daycount": daycount,
        **extra,
    }
    return ValuationResult(clean_price=clean, dirty_price=dirty, accrued=0.0, ytm=ytm, duration=duration, convexity=convexity, trace=trace)


def _business_day_list(start: datetime, end: datetime) -> List[datetime]:
    if end < start:
        start, end = end, start
    sched = calendar252.cal.schedule(start_date=start.strftime('%Y-%m-%d'), end_date=end.strftime('%Y-%m-%d'))
    return [ts.to_pydatetime() for ts in sched.index]


def _cdi_map(start: datetime, end: datetime) -> Dict[str, float]:
    # garantir ordem crescente para evitar 404 no SGS quando dataInicial > dataFinal
    if end < start:
        start, end = end, start
    # Tenta ArcticDB primeiro
    try:
        arctic = get_arctic_service()
        df, _ = arctic.read_market_data('INDEXER_CDI_DAILY', start_date=start.strftime('%Y-%m-%d'), end_date=end.strftime('%Y-%m-%d'))
        if df is not None and getattr(df, 'empty', True) is False and 'cdi_d' in df.columns:
            out = {d.strftime('%d/%m/%Y'): float(v) for d, v in zip(df.index, df['cdi_d']) if pd.notna(v)}
            if out:
                return out
    except Exception:
        pass
    rows = indexers.get_cdi_daily(start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'))
    out: Dict[str, float] = {}
    for r in rows:
        d = r.get('data') or r.get('date')
        v = r.get('valor') or r.get('value')
        if d is None or v is None:
            continue
        try:
            out[str(d)] = float(str(v).replace(',', '.'))
        except Exception:
            continue
    return out


def _selic_map(start: datetime, end: datetime) -> Dict[str, float]:
    if end < start:
        start, end = end, start
    try:
        arctic = get_arctic_service()
        df, _ = arctic.read_market_data('INDEXER_SELIC_DAILY', start_date=start.strftime('%Y-%m-%d'), end_date=end.strftime('%Y-%m-%d'))
        if df is not None and getattr(df, 'empty', True) is False and 'selic_d' in df.columns:
            out = {d.strftime('%d/%m/%Y'): float(v) for d, v in zip(df.index, df['selic_d']) if pd.notna(v)}
            if out:
                return out
    except Exception:
        pass
    rows = indexers.get_selic_daily(start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'))
    out: Dict[str, float] = {}
    for r in rows:
        d = r.get('data') or r.get('date')
        v = r.get('valor') or r.get('value')
        if d is None or v is None:
            continue
        try:
            out[str(d)] = float(str(v).replace(',', '.'))
        except Exception:
            continue
    return out


def _format_ddmmyyyy(d: datetime) -> str:
    return d.strftime('%d/%m/%Y')


def price_cdb_cdi(face_value: float, cdi_multiplier: float, issue_date: datetime, asof: datetime) -> ValuationResult:
    # Normalizar multiplicador (ex.: 120 -> 1.2)
    mult = cdi_multiplier / 100.0 if cdi_multiplier > 5 else cdi_multiplier
    bdays = _business_day_list(issue_date, asof)
    if not bdays:
        return ValuationResult(clean_price=face_value, dirty_price=face_value, accrued=0.0, ytm=None, duration=None, convexity=None, trace={"mult": mult, "bdays": 0})
    cdi = _cdi_map(issue_date, asof)

    def pv_from_mult(m: float) -> Tuple[float, float, int]:
        factor = 1.0
        last_daily = 1.0
        steps = 0
        for d in bdays:
            key = _format_ddmmyyyy(d)
            r = cdi.get(key)
            if r is None:
                continue
            daily = 1.0 + (r / 100.0) * m
            factor *= daily
            last_daily = daily
            steps += 1
        return face_value * factor, last_daily, steps

    pv, last_daily, steps = pv_from_mult(mult)
    accrued = face_value * (pv / face_value - (pv / face_value) / last_daily) if steps >= 1 else 0.0

    # YTM efetiva desde a emissão até as-of (base 252)
    t = max(1, steps) / 252.0
    ytm = pow(pv / face_value, 1.0 / t) - 1.0 if t > 0 else None

    # Duration/Convexidade efetivas por choque no multiplicador (aprox.)
    eps = 1e-4  # 0.01% no multiplicador
    pv_up, _, _ = pv_from_mult(mult * (1.0 + eps))
    pv_dn, _, _ = pv_from_mult(mult * (1.0 - eps))
    if pv > 0:
        duration = (pv_dn - pv_up) / (2.0 * pv * eps)
        convexity = (pv_up + pv_dn - 2.0 * pv) / (pv * eps * eps)
    else:
        duration = None
        convexity = None

    return ValuationResult(clean_price=pv - accrued, dirty_price=pv, accrued=accrued, ytm=ytm, duration=duration, convexity=convexity, trace={"mult": mult, "steps": steps})


def price_cdb_selic(face_value: float, selic_multiplier: float, issue_date: datetime, asof: datetime) -> ValuationResult:
    mult = selic_multiplier / 100.0 if selic_multiplier > 5 else selic_multiplier
    bdays = _business_day_list(issue_date, asof)
    if not bdays:
        return ValuationResult(clean_price=face_value, dirty_price=face_value, accrued=0.0, ytm=None, duration=None, convexity=None, trace={"mult": mult, "bdays": 0})
    sel = _selic_map(issue_date, asof)

    def pv_from_mult(m: float) -> Tuple[float, float, int]:
        factor = 1.0
        last_daily = 1.0
        steps = 0
        for d in bdays:
            key = _format_ddmmyyyy(d)
            r = sel.get(key)
            if r is None:
                continue
            daily = 1.0 + (r / 100.0) * m
            factor *= daily
            last_daily = daily
            steps += 1
        return face_value * factor, last_daily, steps

    pv, last_daily, steps = pv_from_mult(mult)
    accrued = face_value * (pv / face_value - (pv / face_value) / last_daily) if steps >= 1 else 0.0

    t = max(1, steps) / 252.0
    ytm = pow(pv / face_value, 1.0 / t) - 1.0 if t > 0 else None

    eps = 1e-4
    pv_up, _, _ = pv_from_mult(mult * (1.0 + eps))
    pv_dn, _, _ = pv_from_mult(mult * (1.0 - eps))
    if pv > 0:
        duration = (pv_dn - pv_up) / (2.0 * pv * eps)
        convexity = (pv_up + pv_dn - 2.0 * pv) / (pv * eps * eps)
    else:
        duration = None
        convexity = None

    return ValuationResult(clean_price=pv - accrued, dirty_price=pv, accrued=accrued, ytm=ytm, duration=duration, convexity=convexity, trace={"mult": mult, "steps": steps})


def _ipca_ratio(start: datetime, end: datetime, lag_months: int, idx_map: Optional[Dict[str, float]] = None) -> float:
    if idx_map is None:
        idx_map = indexers.get_ipca_number_index()
    i0 = indexers.prorata_ipca(idx_map, start, lag_months)
    i1 = indexers.prorata_ipca(idx_map, end, lag_months)
    if i0 is None or i1 is None or i0 == 0:
        raise ValueError("IPCA ratio unavailable")
    return i1 / i0



def price_ipca_bullet(
    face_value: float,
    real_rate: float,
    issue_date: datetime,
    asof: datetime,
    ipca_lag_months: int = 2,
    daycount: str = "BUS/252",
    maturity_date: Optional[datetime] = None,
    ipca_index_map: Optional[Dict[str, float]] = None,
) -> ValuationResult:
    # Índice IPCA de emissão até as-of (somente até as-of; não projetamos IPCA futuro)
    ratio_asof = _ipca_ratio(issue_date, asof, ipca_lag_months, ipca_index_map)
    t_issue_asof = _year_fraction(daycount, issue_date, asof)
    # PU sujo por capitalização real + correção IPCA até as-of
    pv_nominal_asof = face_value * ratio_asof * pow(1 + real_rate, max(0.0, t_issue_asof))
    # Accrual aproximado: incremento do último dia útil
    try:
        prev_day = calendar252.add_business_days(asof, -1)
    except Exception:
        prev_day = asof
    t_prev = _year_fraction(daycount, issue_date, prev_day)
    pv_prev_nominal = face_value * _ipca_ratio(issue_date, prev_day, ipca_lag_months, ipca_index_map) * pow(1 + real_rate, max(0.0, t_prev))
    accrued = max(0.0, pv_nominal_asof - pv_prev_nominal)
    clean = pv_nominal_asof - accrued

    # Cashflow único no vencimento em termos REAIS (sem projeção de IPCA futuro)
    mat = maturity_date or calendar252.add_business_days(asof, 252)
    t_issue_mat = _year_fraction(daycount, issue_date, mat)
    cf_mat_real = face_value * pow(1 + real_rate, max(0.0, t_issue_mat))
    pv_real_asof = pv_nominal_asof / max(1e-12, ratio_asof)
    ytm_real = _solve_ytm_from_price(pv_real_asof, [(mat, cf_mat_real)], asof, daycount=daycount)
    duration, convexity, extra = _duration_convexity(ytm_real, pv_real_asof, [(mat, cf_mat_real)], asof, daycount)
    return ValuationResult(
        clean_price=clean,
        dirty_price=pv_nominal_asof,
        accrued=accrued,
        ytm=ytm_real,
        duration=duration,
        convexity=convexity,
        trace={
            "mode": "real_ytm",
            "ipca_ratio_asof": ratio_asof,
            "t_issue_asof": t_issue_asof,
            "t_issue_mat": t_issue_mat,
            "maturity_used": (mat.isoformat() if isinstance(mat, datetime) else None),
            **extra,
        },
    )


def _months_between(start: datetime, end: datetime) -> int:
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def _rate_per_period(annual: float, freq_months: int) -> float:
    return pow(1 + (annual or 0.0), freq_months / 12.0) - 1.0


def price_ipca_amortized(
    face_value: float,
    real_rate_annual: float,
    issue_date: datetime,
    asof: datetime,
    maturity_date: datetime,
    amortization: str = "PRICE",
    freq_months: int = 1,
    ipca_lag_months: int = 2,
    daycount: str = "BUS/252",
    ipca_index_map: Optional[Dict[str, float]] = None,
) -> ValuationResult:
    """Valuation IPCA+ com amortização PRICE/SAC, PU limpo/sujo, YTM/duration/convexity via fluxos."""
    # Datas e parâmetros reais
    i_real = _rate_per_period(real_rate_annual or 0.0, freq_months)
    # Número de períodos total e decorridos
    total_months = _months_between(issue_date, maturity_date)
    total_n = max(1, total_months // freq_months)
    elapsed_months = _months_between(issue_date, asof)
    k = min(total_n, elapsed_months // freq_months)

    # Construir cronograma real completo (datas e fluxos em termos reais)
    dates: List[datetime] = []
    d = issue_date
    for _ in range(total_n):
        m = d.month - 1 + freq_months
        y = d.year + m // 12
        m = m % 12 + 1
        day = min(d.day, 28)
        d = d.replace(year=y, month=m, day=day)
        dates.append(d)

    balance_real = face_value
    real_flows: List[float] = []
    if amortization.upper() == "PRICE":
        pmt_real = balance_real * (i_real / (1 - pow(1 + i_real, -total_n))) if i_real != 0 else balance_real / total_n
        for _ in range(total_n):
            interest = balance_real * i_real
            amort = pmt_real - interest
            balance_real = max(0.0, balance_real - amort)
            real_flows.append(max(0.0, amort + interest))
    else:  # SAC
        amort_real = face_value / total_n
        for _ in range(total_n):
            interest = balance_real * i_real
            balance_real = max(0.0, balance_real - amort_real)
            real_flows.append(max(0.0, amort_real + interest))

    # Índice até as-of (não projetamos IPCA futuro). Convertemos somente o saldo e accrual até as-of.
    idx_asof = _ipca_ratio(issue_date, asof, ipca_lag_months, ipca_index_map)

    # PU sujo: saldo nominal (em reais convertido para nominal via índice até as-of) + accrual nominal aproximado
    # Recalcula saldo em reais até k e obtém índice até as-of
    balance_real_k = face_value
    if amortization.upper() == "PRICE":
        pmt_real = face_value * (i_real / (1 - pow(1 + i_real, -total_n))) if i_real != 0 else face_value / total_n
        for _ in range(k):
            interest = balance_real_k * i_real
            amort = pmt_real - interest
            balance_real_k = max(0.0, balance_real_k - amort)
        interest_real_period = balance_real_k * i_real
    else:
        amort_real = face_value / total_n
        for _ in range(k):
            interest = balance_real_k * i_real
            balance_real_k = max(0.0, balance_real_k - amort_real)
        interest_real_period = balance_real_k * i_real
    balance_nominal = balance_real_k * idx_asof

    # Determinar início do período corrente para pro-rata
    period_start = issue_date
    for _ in range(k):
        m = period_start.month - 1 + freq_months
        y = period_start.year + m // 12
        m = m % 12 + 1
        day = min(period_start.day, 28)
        period_start = period_start.replace(year=y, month=m, day=day)

    frac = 0.0
    if (daycount or "").upper().startswith("BUS/252"):
        try:
            days_total = calendar252.business_days_in_year(asof.year) * (freq_months / 12.0)
            days_passed = calendar252.count_business_days(period_start, asof)
            frac = min(1.0, max(0.0, days_passed / max(1.0, days_total)))
        except Exception:
            frac = (asof - period_start).days / max(1.0, 30.0 * freq_months)
    else:
        frac = (asof - period_start).days / max(1.0, 30.0 * freq_months)

    # Accrual nominal aproximado
    # accrual nominal aproximado (apenas real * índice até as-of * fração)
    accrued = max(0.0, interest_real_period * idx_asof * max(0.0, frac))
    dirty = balance_nominal + accrued
    clean = dirty - accrued

    # Fluxos remanescentes após as-of em termos REAIS (não projetamos IPCA futuro)
    future_real_flows: List[Tuple[datetime, float]] = [(dt, rf) for dt, rf in zip(dates, real_flows) if dt > asof]
    pv_real_asof = dirty / max(1e-12, idx_asof)
    ytm = _solve_ytm_from_price(pv_real_asof, future_real_flows, asof, daycount=daycount)
    duration, convexity, extra = _duration_convexity(ytm, pv_real_asof, future_real_flows, asof, daycount)
    return ValuationResult(
        clean_price=clean,
        dirty_price=dirty,
        accrued=accrued,
        ytm=ytm,
        duration=duration,
        convexity=convexity,
        trace={"mode": "real_ytm", "n_total": total_n, "k_elapsed": k, "idx_asof": idx_asof, **extra},
    )


