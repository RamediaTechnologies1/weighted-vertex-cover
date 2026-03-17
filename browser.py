"""Browser abstraction layer wrapping ClawdBot Docker commands."""
import subprocess
import time
import re
from datetime import datetime


def _run_cmd(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr


def _run_cmd_args(args: list) -> str:
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr


def _log(msg: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [BROWSER] {msg}")


class Browser:
    """Abstraction over ClawdBot browser commands."""

    def navigate(self, url: str, wait: float = 5) -> None:
        _log(f"Navigate to {url[:80]}...")
        _run_cmd(f'docker exec openclaw clawdbot browser navigate "{url}"')
        time.sleep(wait)

    def snapshot(self) -> str:
        return _run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

    def click(self, ref: str, wait: float = 2) -> None:
        _log(f"Click {ref}")
        _run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
        time.sleep(wait)

    def type_text(self, ref: str, text: str, wait: float = 0.3) -> None:
        _run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", ref, text])
        time.sleep(wait)

    def press(self, keys: str, wait: float = 0.2) -> None:
        _run_cmd(f'docker exec openclaw clawdbot browser press "{keys}"')
        time.sleep(wait)

    def evaluate(self, fn: str, ref: str = None) -> str:
        if ref:
            return _run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "evaluate", "--fn", fn, "--ref", ref])
        return _run_cmd(f"docker exec openclaw clawdbot browser evaluate --fn '{fn}'")

    def scroll(self, pixels: int = 800, wait: float = 1.5) -> None:
        _run_cmd(f"docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, {pixels})'")
        time.sleep(wait)

    def find_element(self, pattern: str, snapshot: str = None) -> str | None:
        """Find first element ref matching regex pattern in snapshot."""
        if snapshot is None:
            snapshot = self.snapshot()
        match = re.search(pattern, snapshot)
        return match.group(1) if match else None

    def find_all_elements(self, pattern: str, snapshot: str = None) -> list:
        """Find all element refs matching regex pattern."""
        if snapshot is None:
            snapshot = self.snapshot()
        return re.findall(pattern, snapshot)

    def insert_text(self, ref: str, text: str, wait: float = 0.3) -> None:
        """Insert text using execCommand (appends without clearing field)."""
        escaped = text.replace("\\", "\\\\").replace("'", "\\'")
        self.evaluate(f"(el) => {{ el.focus(); document.execCommand('insertText', false, '{escaped}'); }}", ref)
        time.sleep(wait)


class AIAgent:
    """Wrapper for ClawdBot AI agent text generation."""

    def generate(self, prompt: str, session_id: str = "default") -> str:
        escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
        result = _run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id {session_id} 2>/dev/null")
        return self._parse_response(result)

    def _parse_response(self, raw: str) -> str:
        for line in raw.strip().split('\n'):
            line = line.strip().strip('"').strip("'")
            if line and not line.startswith('[') and not line.startswith('(') and len(line) > 10:
                return line
        return ""
