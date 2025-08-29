from datetime import datetime
from typing import Set

import pandas as pd
import pandas_market_calendars as pmc


class Business252:
    """Calendário de negócios estilo B3 (bus/252)."""

    def __init__(self):
        # B3 calendar (includes nacionais e alguns locais); personalizável se necessário
        self.cal = pmc.get_calendar('BVMF')

    def is_business_day(self, date: datetime) -> bool:
        sched = self.cal.schedule(start_date=date.strftime('%Y-%m-%d'), end_date=date.strftime('%Y-%m-%d'))
        return not sched.empty

    def business_days_in_year(self, year: int) -> int:
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        sched = self.cal.schedule(start_date=start, end_date=end)
        return len(sched.index)

    def add_business_days(self, date: datetime, n: int) -> datetime:
        # Usa o schedule e move n dias úteis
        start = date
        step = 1 if n >= 0 else -1
        remaining = abs(n)
        d = start
        while remaining > 0:
            d = d + pd.Timedelta(days=step)
            if self.is_business_day(d.to_pydatetime()):
                remaining -= 1
        return d.to_pydatetime()

    def count_business_days(self, start: datetime, end: datetime) -> int:
        if end < start:
            start, end = end, start
        sched = self.cal.schedule(start_date=start.strftime('%Y-%m-%d'), end_date=end.strftime('%Y-%m-%d'))
        return len(sched.index)


calendar252 = Business252()


