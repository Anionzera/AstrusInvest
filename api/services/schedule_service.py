from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List

import pandas as pd


@dataclass
class Period:
    date: datetime
    coupon: float
    amort: float
    balance: float


def month_diff(start: datetime, end: datetime) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


def generate_periods(issue_date: datetime, maturity_date: datetime, freq_months: int = 1) -> List[datetime]:
    # Datas no último dia do mês de cada período, começando após a emissão
    rng = pd.date_range(issue_date, maturity_date, freq=f"{freq_months}M", inclusive="neither")
    dates = [d.to_pydatetime() for d in rng]
    return dates + [maturity_date]


def schedule_price(face_value: float, real_rate_annual: float, issue_date: datetime, maturity_date: datetime, freq_months: int = 1) -> List[Period]:
    n = max(1, month_diff(issue_date, maturity_date) // freq_months)
    i = pow(1 + real_rate_annual, freq_months / 12.0) - 1.0
    pmt = face_value * (i / (1 - pow(1 + i, -n))) if i != 0 else face_value / n
    dates = generate_periods(issue_date, maturity_date, freq_months)
    balance = face_value
    out: List[Period] = []
    for d in dates:
        coupon = balance * i
        amort = max(0.0, pmt - coupon)
        balance = max(0.0, balance - amort)
        out.append(Period(date=d, coupon=coupon, amort=amort, balance=balance))
    return out


def schedule_sac(face_value: float, real_rate_annual: float, issue_date: datetime, maturity_date: datetime, freq_months: int = 1) -> List[Period]:
    n = max(1, month_diff(issue_date, maturity_date) // freq_months)
    i = pow(1 + real_rate_annual, freq_months / 12.0) - 1.0
    amort_fixed = face_value / n
    dates = generate_periods(issue_date, maturity_date, freq_months)
    balance = face_value
    out: List[Period] = []
    for d in dates:
        coupon = balance * i
        amort = amort_fixed
        balance = max(0.0, balance - amort)
        out.append(Period(date=d, coupon=coupon, amort=amort, balance=balance))
    return out


