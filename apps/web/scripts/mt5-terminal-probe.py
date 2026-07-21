import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="XAUUSD")
    parser.add_argument("--terminal-path")
    parser.add_argument("--login")
    parser.add_argument("--password")
    parser.add_argument("--server")
    return parser.parse_args()


def detect_terminal_paths(explicit_path):
    candidates = []
    seen = set()

    for value in [explicit_path, os.getenv("MT5_TERMINAL_PATH")]:
        if value and value not in seen:
            seen.add(value)
            candidates.append(value)

    search_patterns = []

    for root in [os.getenv("PROGRAMFILES"), os.getenv("PROGRAMFILES(X86)")]:
        if root:
            search_patterns.extend(
                [
                    (Path(root), "*/terminal64.exe"),
                    (Path(root), "*/*/terminal64.exe"),
                ]
            )

    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        search_patterns.extend(
            [
                (Path(local_app_data), "Programs/*/terminal64.exe"),
                (Path(local_app_data), "Programs/*/*/terminal64.exe"),
                (Path(local_app_data), "MetaQuotes/Terminal/*/terminal64.exe"),
            ]
        )

    for root_path, pattern in search_patterns:
        if not root_path.exists():
            continue

        for match in root_path.glob(pattern):
            value = str(match)
            if value not in seen:
                seen.add(value)
                candidates.append(value)
            if len(candidates) >= 10:
                return candidates

    return candidates


def trade_mode(account_info):
    if not account_info:
        return "unconfigured"

    server = str(getattr(account_info, "server", "") or "").lower()
    company = str(getattr(account_info, "company", "") or "").lower()
    if not getattr(account_info, "trade_allowed", False):
        return "read-only"
    if "demo" in server or "demo" in company:
        return "demo"
    return "live"


def iso_from_time_msc(value):
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat()


def normalize_ping(value):
    if value is None:
        return None
    if value > 1000000:
        return round(value / 1000, 2)
    if value > 1000:
        return round(value / 1000, 2)
    return round(value, 2)


def build_error(symbol, detected_paths, message):
    return {
        "ok": False,
        "source": "mt5-local-python",
        "terminalDetected": bool(detected_paths),
        "terminalConnected": False,
        "accountConnected": False,
        "symbol": symbol,
        "symbolSelected": False,
        "terminalPath": detected_paths[0] if detected_paths else None,
        "terminalName": None,
        "detectedTerminalPaths": detected_paths,
        "brokerName": None,
        "server": None,
        "accountLogin": None,
        "tradeMode": "unconfigured",
        "pingMs": None,
        "balance": None,
        "equity": None,
        "margin": None,
        "freeMargin": None,
        "marginLevel": None,
        "currency": None,
        "leverage": None,
        "bid": None,
        "ask": None,
        "spread": None,
        "lastTickAt": None,
        "ticksPerMinute": None,
        "positionsTotal": None,
        "ordersTotal": None,
        "permissions": [],
        "error": message,
    }


def main():
    args = parse_args()
    symbol = args.symbol
    detected_paths = detect_terminal_paths(args.terminal_path)

    try:
        import MetaTrader5 as mt5
    except ImportError:
        print(json.dumps(build_error(symbol, detected_paths, "MetaTrader5 Python package is not installed.")))
        return

    initialize_kwargs = {}
    if detected_paths:
        initialize_kwargs["path"] = detected_paths[0]
    if args.login:
        initialize_kwargs["login"] = int(args.login)
    if args.password:
        initialize_kwargs["password"] = args.password
    if args.server:
        initialize_kwargs["server"] = args.server

    connected = mt5.initialize(**initialize_kwargs)
    if not connected:
        print(json.dumps(build_error(symbol, detected_paths, f"MT5 initialize failed: {mt5.last_error()}")))
        return

    try:
        terminal_info = mt5.terminal_info()
        account_info = mt5.account_info()
        symbol_selected = bool(mt5.symbol_select(symbol, True))
        tick = mt5.symbol_info_tick(symbol)
        tick_count = None

        try:
            tick_window_start = datetime.now(timezone.utc) - timedelta(minutes=1)
            tick_window = mt5.copy_ticks_from(symbol, tick_window_start, 1000, mt5.COPY_TICKS_ALL)
            tick_count = len(tick_window) if tick_window is not None else None
        except Exception:
            tick_count = None

        permissions = []
        if tick and tick.bid and tick.ask:
            permissions.append("prices")
        if account_info:
            permissions.extend(["account-state", "history"])
        try:
            positions_total = mt5.positions_total()
            permissions.append("positions")
        except Exception:
            positions_total = None
        try:
            orders_total = mt5.orders_total()
            permissions.append("orders")
        except Exception:
            orders_total = None

        permissions = sorted(set(permissions))

        result = {
            "ok": bool(terminal_info and account_info and tick),
            "source": "mt5-local-python",
            "terminalDetected": bool(detected_paths),
            "terminalConnected": bool(getattr(terminal_info, "connected", False)),
            "accountConnected": account_info is not None,
            "symbol": symbol,
            "symbolSelected": symbol_selected,
            "terminalPath": str(getattr(terminal_info, "path", None) or (detected_paths[0] if detected_paths else "")) or None,
            "terminalName": getattr(terminal_info, "name", None),
            "detectedTerminalPaths": detected_paths,
            "brokerName": getattr(account_info, "company", None) if account_info else None,
            "server": getattr(account_info, "server", None) if account_info else None,
            "accountLogin": str(getattr(account_info, "login", "")) if account_info else None,
            "tradeMode": trade_mode(account_info),
            "pingMs": normalize_ping(getattr(terminal_info, "ping_last", None) if terminal_info else None),
            "balance": round(getattr(account_info, "balance", 0.0), 2) if account_info and getattr(account_info, "balance", None) is not None else None,
            "equity": round(getattr(account_info, "equity", 0.0), 2) if account_info and getattr(account_info, "equity", None) is not None else None,
            "margin": round(getattr(account_info, "margin", 0.0), 2) if account_info and getattr(account_info, "margin", None) is not None else None,
            "freeMargin": round(getattr(account_info, "margin_free", 0.0), 2) if account_info and getattr(account_info, "margin_free", None) is not None else None,
            "marginLevel": round(getattr(account_info, "margin_level", 0.0), 2) if account_info and getattr(account_info, "margin_level", None) is not None else None,
            "currency": getattr(account_info, "currency", None) if account_info else None,
            "leverage": int(getattr(account_info, "leverage", 0)) if account_info and getattr(account_info, "leverage", None) is not None else None,
            "bid": round(tick.bid, 2) if tick and tick.bid is not None else None,
            "ask": round(tick.ask, 2) if tick and tick.ask is not None else None,
            "spread": round((tick.ask - tick.bid), 2) if tick and tick.ask is not None and tick.bid is not None else None,
            "lastTickAt": iso_from_time_msc(getattr(tick, "time_msc", None)) if tick else None,
            "ticksPerMinute": tick_count,
            "positionsTotal": positions_total,
            "ordersTotal": orders_total,
            "permissions": permissions,
            "error": None,
        }
        print(json.dumps(result))
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
