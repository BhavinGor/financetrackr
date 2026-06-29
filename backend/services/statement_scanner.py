"""
Raw bank statement text scanner.

Parses the OCR-extracted text to build a map of
  (date_str, amount_str) → raw_particulars

so that the description enricher can work from the actual bank reference string
rather than relying on the LLM to output rawParticulars.

HDFC/ICICI multi-line table format:
  The PARTICULARS column wraps. In the extracted text, the layout is:
    <first part of PARTICULARS>   ← line before the date
    DD-MM-YYYY <middle of PARTICULARS> AMOUNT BALANCE
    <last part of PARTICULARS (hash)>  ← line after the date

  So: the window between the PREVIOUS date line and the CURRENT date line
  (exclusive) contains the START of the current transaction's particulars.
"""
import re
from typing import Dict, Tuple


def _normalize_date(raw: str) -> str:
    m = re.match(r'(\d{2})[-/](\d{2})[-/](\d{4})', raw)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return raw


_DATE_RE = re.compile(r'(\d{2}[-/]\d{2}[-/]\d{4})')
_AMOUNT_RE = re.compile(r'(\d{1,3}(?:,\d{3})*\.\d{2})')


def build_particulars_map(extracted_text: str) -> dict:
    """
    Return dict: (yyyy-mm-dd, "amount.2f") → raw_particulars_string

    Also populates with (yyyy-mm-dd, "amount.2f", "direction") → "CREDIT"|"DEBIT"
    for use by the enricher to correct wrong LLM-detected directions.

    Strategy:
    - Split text into line groups between consecutive date lines
    - The lines BEFORE a date line = start of THAT transaction's particulars
    - The date line itself contains the remainder of particulars + date + amounts
    - Lines AFTER the date line = tail of particulars (hash continuation)
    - Direction is determined by comparing balance to previous balance
    """
    lines = [l.rstrip() for l in extracted_text.splitlines()]

    # Find positions of all date lines
    date_positions = []
    for i, line in enumerate(lines):
        m = _DATE_RE.search(line)
        if m and m.start() < 12:  # date near start of line → transaction row
            date_positions.append((i, m.group(1)))

    if not date_positions:
        return {}

    result: dict = {}
    prev_balance: float | None = None

    for idx, (line_idx, date_raw) in enumerate(date_positions):
        date_str = _normalize_date(date_raw)
        date_line = lines[line_idx]

        # Lines before this date, after the previous date line = start of particulars
        prev_date_line = date_positions[idx - 1][0] if idx > 0 else -1
        pre_lines = [lines[i] for i in range(prev_date_line + 1, line_idx)]

        # Lines after this date, before the next date line = tail of particulars (hash)
        next_date_line = date_positions[idx + 1][0] if idx + 1 < len(date_positions) else len(lines)
        _tx_prefixes = ('UPI/', 'NEFT', 'ACH/', 'MMT/', 'ATM', 'RTGS')
        post_lines = []
        for li in range(line_idx + 1, min(line_idx + 4, next_date_line)):
            stripped_l = lines[li].strip()
            if not stripped_l:
                continue
            # Stop if this looks like the start of the next transaction's particulars
            if any(stripped_l.upper().startswith(p) for p in _tx_prefixes):
                break
            post_lines.append(stripped_l)

        # Build full particulars: pre_lines + date_line_text (stripped of date) + post_lines
        date_line_without_date = _DATE_RE.sub('', date_line, count=1).strip()

        # Amounts are at the end of the date line: amount + balance
        amounts_in_line = _AMOUNT_RE.findall(date_line)
        if len(amounts_in_line) < 2:
            # B/F or header row — record balance and skip
            if amounts_in_line:
                try:
                    prev_balance = float(amounts_in_line[-1].replace(',', ''))
                except ValueError:
                    pass
            continue

        tx_amount_raw = amounts_in_line[-2]
        balance_raw = amounts_in_line[-1]
        try:
            tx_amount = f"{float(tx_amount_raw.replace(',', '')):.2f}"
            current_balance = float(balance_raw.replace(',', ''))
        except ValueError:
            prev_balance = None
            continue

        # Determine direction from balance change
        direction: str | None = None
        if prev_balance is not None:
            delta = current_balance - prev_balance
            direction = 'CREDIT' if delta > 0 else 'DEBIT'
        prev_balance = current_balance

        # Remove the trailing amounts from the date line text to get middle particulars
        middle_particulars = date_line_without_date
        for amt in amounts_in_line:
            middle_particulars = middle_particulars.replace(amt, '', 1)
        middle_particulars = middle_particulars.strip()

        # Combine: [pre] + [middle of date line] + [post hash lines]
        all_parts = [l.strip() for l in pre_lines if l.strip()]
        if middle_particulars:
            all_parts.append(middle_particulars)
        all_parts.extend(l.strip() for l in post_lines if l.strip())

        particulars = ' '.join(all_parts).strip()

        # Remove the date string from particulars in case it leaked in
        particulars = _DATE_RE.sub('', particulars).strip()

        key = (date_str, tx_amount)
        if key in result:
            # Duplicate key (same date+amount) — mark ambiguous
            result[key] = None
            result[(date_str, tx_amount, 'direction')] = None
        else:
            result[key] = particulars
            if direction:
                result[(date_str, tx_amount, 'direction')] = direction

    return result
