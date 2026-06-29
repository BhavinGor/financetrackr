"""
Python-based description enricher for bank transaction particulars.

Parses UPI, NEFT, IMPS, ACH, and other structured bank reference strings
into clean human-readable descriptions. This is deterministic and does not
rely on the LLM, giving consistent results regardless of model quality.
"""
import re

# Merchant name → clean description mapping (case-insensitive)
_UPI_MERCHANT_MAP = {
    "netflix": "Netflix Subscription",
    "spotify": "Spotify Subscription",
    "openai llc": "OpenAI Subscription",
    "openai": "OpenAI Subscription",
    "rfndopenai": "OpenAI Refund",
    "indmoney": "INDmoney Investment",
    "npci bhim": "BHIM Cashback",
    "bhimcashback": "BHIM Cashback",
    "jupiter up": "Jupiter Transfer",
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "phonepe": "PhonePe Transfer",
    "paytm": "Paytm Transfer",
    "google pay": "Google Pay Transfer",
    "gpay": "Google Pay Transfer",
    "uber": "Uber",
    "ola": "Ola",
    "bookmyshow": "BookMyShow",
    "irctc": "IRCTC Ticket",
    "airtel": "Airtel Recharge",
    "vodafone": "Vodafone Recharge",
    "jio": "Jio Recharge",
    "bsnl": "BSNL Recharge",
    "nsdl payme": "NSDL Payment",
}

# Partial match patterns for RFND prefix
_RFND_RE = re.compile(r'^rfnd(.+)$', re.IGNORECASE)


def _clean_name(raw: str) -> str:
    """Title-case a raw name, strip extra whitespace."""
    return ' '.join(w.capitalize() for w in raw.strip().split() if w)


def enrich_from_upi(particulars: str, tx_type: str, holder_name: str = '') -> str | None:
    """
    Parse a UPI particulars string and return a clean description.
    Returns None if it doesn't look like a UPI entry.

    Format: UPI/<MERCHANT>/<UPI-VPA>/<short-desc>/<BANK>/<ref>/<hash>/
    """
    if not particulars.upper().startswith('UPI/'):
        return None

    # Normalise multi-line: collapse whitespace and newlines
    normalized = re.sub(r'\s+', ' ', particulars).strip()
    segments = [s.strip() for s in normalized.split('/') if s.strip()]
    # segments[0] = 'UPI', segments[1] = merchant, segments[2] = VPA, ...
    if len(segments) < 2:
        return None

    merchant = segments[1].strip()

    # Check for RFND prefix (refund)
    rfnd_m = _RFND_RE.match(merchant)
    if rfnd_m:
        base_merchant = rfnd_m.group(1).strip().lower()
        for key, label in _UPI_MERCHANT_MAP.items():
            if key in base_merchant:
                # e.g. "Netflix Refund" instead of "Netflix Subscription"
                base_label = label.replace(' Subscription', '').replace(' Payment', '')
                return f"{base_label} Refund"
        return f"{_clean_name(rfnd_m.group(1))} Refund"

    merchant_lower = merchant.lower()

    # Direct map lookup
    for key, label in _UPI_MERCHANT_MAP.items():
        if key in merchant_lower:
            return label

    # Person name detection:
    #   - No dots in the name (UPI VPAs have @ or dots)
    #   - No digits
    #   - More than one word usually (first + last)
    is_person = bool(re.match(r'^[A-Za-z ]+$', merchant)) and ' ' in merchant

    if is_person:
        # Check if this person is the account holder (self-transfer)
        holder_norm = re.sub(r'(mr\.|mrs\.|ms\.)', '', holder_name, flags=re.IGNORECASE).strip().lower()
        if holder_norm and merchant_lower in holder_norm:
            # Credit self-transfer: "Self Transfer from <Bank>"
            if tx_type.upper() == 'CREDIT' and len(segments) >= 5:
                bank_seg = segments[4]
                # Use first word as bank short name (e.g. "Kotak Mahi" → "Kotak")
                bank_first_word = re.split(r'[\s\d]', bank_seg.strip())[0].rstrip('/')
                if bank_first_word:
                    return f"Self Transfer from {bank_first_word.capitalize()}"
            return "Self Transfer"

        first_name = merchant.split()[0]
        if tx_type.upper() == 'DEBIT':
            return f"Transfer to {_clean_name(merchant)}"
        else:
            return f"Transfer from {_clean_name(first_name)}"

    # Fall back to clean merchant name
    return _clean_name(merchant)


def enrich_from_neft(particulars: str) -> str | None:
    if not re.match(r'^NEFT[-/]', particulars, re.IGNORECASE):
        return None
    # NEFT-<ref>-<BENEFICIARY>-<acc>-...
    parts = re.split(r'[-/]', particulars)
    # Find the first human-readable segment (all letters/spaces, length > 3)
    for p in parts[2:]:
        p = p.strip()
        if len(p) > 3 and re.match(r'^[A-Za-z\s]+$', p):
            return f"NEFT - {_clean_name(p)}"
    return "NEFT Transfer"


def enrich_from_imps(particulars: str) -> str | None:
    # MMT/IMPS/<ref>/<channel>/<NAME>/<BANK>
    m = re.match(r'^MMT/IMPS/\d+/\w+/([^/]+)/([^/\s]+)', particulars, re.IGNORECASE)
    if not m:
        return None
    bank = m.group(2).strip()
    bank_name = re.split(r'\d', bank)[0].strip() or bank
    return f"IMPS Transfer from {_clean_name(bank_name)}"


def enrich_from_ach(particulars: str) -> str | None:
    m = re.match(r'^ACH/([^/]+)/', particulars, re.IGNORECASE)
    if not m:
        return None
    entity = _clean_name(m.group(1))
    return f"ACH Debit - {entity}"


def _extract_segment(raw: str, prefix: str) -> str | None:
    """
    Find `prefix` anywhere in `raw` and return from that position onward.
    Used to handle hash fragments prepended by the scanner.
    """
    idx = raw.upper().find(prefix.upper())
    if idx == -1:
        return None
    return raw[idx:]


def enrich_description(raw_particulars: str, tx_type: str, holder_name: str = '') -> str | None:
    """
    Try each enricher in order. Return the first non-None result.
    Returns None if no enricher matches (caller keeps LLM description).

    If raw_particulars has a leading hash fragment (e.g. "A4278/ UPI/NETFLIX/..."),
    we search for known patterns anywhere within the string.
    """
    if not raw_particulars:
        return None

    # Try each known pattern, searching within the full string
    for prefix in ('UPI/', 'MMT/IMPS/', 'NEFT-', 'NEFT/', 'ACH/'):
        segment = _extract_segment(raw_particulars, prefix)
        if segment:
            result = (
                enrich_from_upi(segment, tx_type, holder_name)
                or enrich_from_imps(segment)
                or enrich_from_neft(segment)
                or enrich_from_ach(segment)
            )
            if result:
                return result

    return None
