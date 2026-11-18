#!/usr/bin/env python
"""重置本机 open-webui 账号的密码（忘记密码时用）。

用法（在本仓库根目录 open-webui/）：

    .venv\\Scripts\\python.exe reset-admin-password.py      # Windows
    .venv/bin/python reset-admin-password.py                # Linux/macOS

密码由你在终端里输入（getpass），**不经过命令行参数**，因此不会出现在
shell 历史、进程列表或任何日志里；脚本也不会回显密码，只打印成功/失败。

它只改本机 backend/data/webui.db 里 auth 表的 password 字段，别的数据不动。
改之前自动把数据库备份到 backend/data/_pwd_backup_<时间戳>/。

哈希算法与 open_webui/utils/auth.py 的 get_password_hash 保持一致
（读 backend/.env 的 PASSWORD_HASH_ALGORITHM，默认 bcrypt）。
"""

from __future__ import annotations

import getpass
import os
import shutil
import socket
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR / "backend"


def read_env_value(key: str, default: str | None = None) -> str | None:
    """从 backend/.env 里读一个键值（只认最简单的 KEY=VALUE 形式）。"""
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        return default
    for raw in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, _, value = line.partition("=")
        if name.strip() == key:
            value = value.strip().strip('"').strip("'")
            return value or default
    return default


def port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((host, port)) == 0


def hash_password(password: str, algorithm: str) -> str:
    if algorithm == "argon2":
        from argon2 import PasswordHasher

        return PasswordHasher().hash(password)
    import bcrypt

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if hashed.startswith("$argon2"):
        from argon2 import PasswordHasher
        from argon2.exceptions import InvalidHashError, VerificationError

        try:
            return PasswordHasher().verify(hashed, password)
        except (InvalidHashError, VerificationError):
            return False
    import bcrypt

    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def main() -> int:
    data_dir = Path(
        os.getenv("DATA_DIR") or read_env_value("DATA_DIR") or (BACKEND_DIR / "data")
    ).resolve()
    db_path = data_dir / "webui.db"
    algorithm = (read_env_value("PASSWORD_HASH_ALGORITHM") or "bcrypt").lower()

    print(f"数据库：{db_path}")
    print(f"哈希算法：{algorithm}")
    if not db_path.exists():
        print("ERROR: 找不到 webui.db，确认 DATA_DIR 是否指对了。", file=sys.stderr)
        return 1

    if port_in_use("127.0.0.1", 8083):
        print(
            "ERROR: open-webui 后端还在跑（:8083）。\n"
            "      先停掉它再改密码——它开着的时候数据库里可能还有未落盘的写。",
            file=sys.stderr,
        )
        return 1

    con = sqlite3.connect(str(db_path))
    try:
        rows = con.execute(
            """
            SELECT u.id, u.name, u.email, u.role
            FROM user u JOIN auth a ON a.id = u.id
            ORDER BY u.role, u.name
            """
        ).fetchall()
        if not rows:
            print("ERROR: 库里没有可登录的账号。", file=sys.stderr)
            return 1

        print("\n本机账号：")
        for index, (_id, name, email, role) in enumerate(rows, start=1):
            print(f"  [{index}] {name}  <{email}>  角色={role}")

        default = next((i for i, r in enumerate(rows, start=1) if r[3] == "admin"), 1)
        raw_choice = input(f"\n要重置哪个账号的密码？序号 [默认 {default}]： ").strip()
        choice = int(raw_choice) if raw_choice.isdigit() else default
        if not 1 <= choice <= len(rows):
            print("序号越界。", file=sys.stderr)
            return 1
        user_id, name, email, _role = rows[choice - 1]
        print(f"\n重置：{name} <{email}>")

        password = getpass.getpass("新密码（输入不回显）： ")
        if not password:
            print("密码为空，未改动。", file=sys.stderr)
            return 1
        if len(password) < 8:
            print("密码太短（至少 8 位），未改动。", file=sys.stderr)
            return 1
        if algorithm == "bcrypt" and len(password.encode("utf-8")) > 72:
            print("bcrypt 只接受 72 字节以内的密码，未改动。", file=sys.stderr)
            return 1
        again = getpass.getpass("再输一次确认： ")
        if password != again:
            print("两次不一致，未改动。", file=sys.stderr)
            return 1

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = data_dir / f"_pwd_backup_{stamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        for file_name in ("webui.db", "webui.db-wal", "webui.db-shm"):
            src = data_dir / file_name
            if src.exists():
                shutil.copy2(src, backup_dir / file_name)
        print(f"\n已备份数据库到 {backup_dir}")

        hashed = hash_password(password, algorithm)
        con.execute("UPDATE auth SET password = ? WHERE id = ?", (hashed, user_id))
        con.commit()

        stored = con.execute("SELECT password FROM auth WHERE id = ?", (user_id,)).fetchone()[0]
        if not verify_password(password, stored):
            print("写入后校验失败，请用备份恢复。", file=sys.stderr)
            return 1
        print("密码已重置并校验通过。")
        print("下一步：启动 open-webui（document_agent\\start-all.ps1），")
        print(f"        打开 http://127.0.0.1:8083 用 {email} 登录。")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())
