import os
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re

import requests
import requests_cache
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class IndexerService:
    """Acesso oficial a CDI/SELIC (BCB SGS) e IPCA número-índice (SIDRA/IBGE), com cache.

    - CDI diário (SGS 12), SELIC diário (SGS 11)
    - IPCA número-índice (SIDRA 1737, variável 2266: 'Número-índice (dez/1993=100)')
    - Interpolação pró-rata diária para IPCA (com defasagem configurável via parâmetro)
    - Cache persistente via requests-cache
    """

    SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
    # IPCA número-índice (t=1737, v=2266: Número-índice, base dez/1993=100)
    SIDRA_BASE = "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/all"

    def __init__(self, cache_name: str = "indexers_v2", expire_hours: int = 12):
        backend = os.environ.get("INDEXERS_CACHE_BACKEND", "sqlite")
        # sessão cacheada com retry/backoff
        self.session = requests_cache.CachedSession(cache_name=cache_name, backend=backend, expire_after=expire_hours * 3600)
        retry = Retry(total=3, connect=3, read=3, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=frozenset(["GET"]))
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self._last_prefetch: Dict[str, float] = {}

    def _fetch_sgs(self, code: int, start: Optional[str] = None, end: Optional[str] = None) -> List[Dict]:
        params = {"formato": "json"}

        def _fmt(d: Optional[str]) -> Optional[str]:
            if not d:
                return None
            # SGS espera dd/mm/aaaa
            try:
                if "/" in d:
                    return d
                from datetime import datetime as _dt
                dt = _dt.strptime(d[:10], "%Y-%m-%d")
                return dt.strftime("%d/%m/%Y")
            except Exception:
                return d

        if start:
            params["dataInicial"] = _fmt(start)
        if end:
            params["dataFinal"] = _fmt(end)
        url = self.SGS_BASE.format(code=code)
        import time as _time
        params["_"] = str(int(_time.time()))  # cache buster
        headers = {"Accept": "application/json"}
        r = self.session.get(url, params=params, headers=headers, timeout=(5, 60))
        if r.status_code == 406:
            # Fallback para CSV quando o JSON é rejeitado (SGS retorna 406 às vezes com janelas longas)
            params_csv = dict(params)
            params_csv["formato"] = "csv"
            headers_csv = {"Accept": "text/csv, */*"}
            r_csv = self.session.get(url, params=params_csv, headers=headers_csv, timeout=(5, 60))
            r_csv.raise_for_status()
            # Parse simples do CSV: data;valor\n
            lines = [ln.strip() for ln in r_csv.text.splitlines() if ln.strip()]
            out: List[Dict] = []
            # ignorar header se presente
            for ln in lines:
                if ln.lower().startswith("data;valor"):
                    continue
                parts = ln.split(";")
                if len(parts) < 2:
                    continue
                out.append({"data": parts[0], "valor": parts[1]})
            return out
        r.raise_for_status()
        return r.json()

    def _fetch_ipca_index(self) -> List[Dict]:
        r = self.session.get(self.SIDRA_BASE, params={"formato": "json"}, timeout=(5, 60))
        r.raise_for_status()
        data = r.json()
        # formato: lista com cabeçalho na primeira posição
        if isinstance(data, list) and data and isinstance(data[0], dict) and any(k.lower().startswith("id") for k in data[0].keys()):
            return data[1:]
        return data

    def get_cdi_daily(self, start: str, end: str) -> List[Dict[str, str]]:
        return self._fetch_sgs(12, start, end)

    def get_selic_daily(self, start: str, end: str) -> List[Dict[str, str]]:
        return self._fetch_sgs(11, start, end)

    def get_ipca_number_index(self) -> Dict[str, float]:
        rows = self._fetch_ipca_index()
        out: Dict[str, float] = {}
        for row in rows:
            # Período: tentar p, depois D3C, depois extrair dígitos
            raw_p = row.get("p") or row.get("D3C") or row.get("Mês (Código)") or row.get("Mês") or ""
            p_str = str(raw_p)
            digits = re.findall(r"\d{6}", p_str)
            if digits:
                ym = digits[0]
            else:
                # Às vezes vem AAAA e M separado
                digs = re.findall(r"\d+", p_str)
                if not digs:
                    continue
                if len(digs[0]) == 6:
                    ym = digs[0]
                elif len(digs) >= 2 and len(digs[0]) == 4:
                    ym = digs[0] + digs[1].zfill(2)
                else:
                    continue

            # Valor
            raw_v = row.get("V") or row.get("Valor") or row.get("Índice (dez/1993=100)")
            if raw_v is None:
                continue
            s = str(raw_v).strip()
            if s in ("...", "NA", "-"):
                continue
            try:
                v = float(s.replace(",", "."))
            except Exception:
                continue
            out[ym] = v

        # fallback: se ainda vazio, tentar endpoint alternativo (sem values/)
        if not out:
            alt = self.session.get("https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/all?formato=json", timeout=(5, 60))
            alt.raise_for_status()
            data = alt.json()
            if isinstance(data, list) and len(data) > 1:
                for row in data[1:]:
                    p_str = str(row.get("p") or row.get("D3C") or row.get("Mês (Código)") or "")
                    digits = re.findall(r"\d{6}", p_str)
                    if not digits:
                        continue
                    ym = digits[0]
                    s = str(row.get("V") or row.get("Índice (dez/1993=100)") or "").strip()
                    if s in ("...", "NA", "-") or not s:
                        continue
                    try:
                        v = float(s.replace(",", "."))
                    except Exception:
                        continue
                    out[ym] = v
        return out

    def get_cdi_12m(self) -> List[Dict[str, str]]:
        """CDI acumulado em 12 meses (% a.a.) - SGS 4391"""
        url = self.SGS_BASE.format(code=4391)
        r = self.session.get(url, params={"formato": "json"}, timeout=(5, 60))
        r.raise_for_status()
        return r.json()

    def prefetch_range(self, start: str, end: str) -> None:
        """Prefetch CDI, SELIC e IPCA índice para acelerar respostas."""
        key = f"{start}:{end}"
        if self._last_prefetch.get(key):
            return
        try:
            _ = self.get_cdi_daily(start, end)
            _ = self.get_selic_daily(start, end)
            _ = self.get_ipca_number_index()
            self._last_prefetch[key] = time.time()
        except Exception:
            pass

    @staticmethod
    def prorata_ipca(index_map: Dict[str, float], date: datetime, lag_months: int = 2) -> float:
        """Calcula fator diário IPCA por pró‑rata usando número‑índice mensal com defasagem.

        - index_map: {AAAAMM: índice}
        - date: data alvo
        - lag_months: defasagem (padrão 2)
        Retorna o índice diário interpolado para 'date'.
        """
        def ym(dt: datetime) -> str:
            return f"{dt.year}{dt.month:02d}"

        def prev_month(dt: datetime) -> datetime:
            first = dt.replace(day=1)
            return (first - timedelta(days=1)).replace(day=1)

        ref_prev = date.replace(day=1)
        for _ in range(lag_months):
            ref_prev = prev_month(ref_prev)

        # alvo: m0=ref_prev, m1=next month
        def next_month(dt: datetime) -> datetime:
            return (dt.replace(day=28) + timedelta(days=4)).replace(day=1)

        m1_try = next_month(ref_prev)
        m0_try = ref_prev

        # fallback: procurar pares disponíveis para i0/i1 andando para trás até 24 meses
        tries = 0
        i0 = index_map.get(ym(m0_try))
        i1 = index_map.get(ym(m1_try))
        while (i0 is None or i1 is None) and tries < 36:
            m1_try = prev_month(m1_try)
            m0_try = prev_month(m1_try)
            i0 = index_map.get(ym(m0_try))
            i1 = index_map.get(ym(m1_try))
            tries += 1
        if i0 is None or i1 is None:
            raise ValueError("Índice IPCA ausente para meses de referência")

        # interpolação linear por dias corridos dentro do mês de 'date'
        first = date.replace(day=1)
        next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
        days_in_month = (next_month - first).days
        day = date.day
        w = (day - 1) / max(1, days_in_month - 1)
        return i0 + (i1 - i0) * w


service = IndexerService()


