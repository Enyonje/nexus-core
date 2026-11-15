#!/usr/bin/env python3
"""Validate marketplace ZIP structure and optionally extract it safely."""
import argparse, json, os, stat, subprocess, sys, zipfile
MAX_FILES = 5000
MAX_UNCOMPRESSED = 100 * 1024 * 1024
MAX_RATIO = 200

def inspect(path):
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if not infos or len(infos) > MAX_FILES:
            raise ValueError("ZIP must contain between 1 and 5,000 entries.")
        total, manifest = 0, None
        for info in infos:
            name = info.filename.replace("\\", "/")
            parts = name.split("/")
            mode = (info.external_attr >> 16) & 0xFFFF
            if name.startswith("/") or any(part == ".." for part in parts) or (len(name) > 1 and name[1] == ":"):
                raise ValueError("ZIP contains an unsafe path.")
            if stat.S_ISLNK(mode):
                raise ValueError("ZIP symbolic links are not allowed.")
            total += info.file_size
            if total > MAX_UNCOMPRESSED:
                raise ValueError("Expanded ZIP size exceeds 100 MB.")
            if info.compress_size and info.file_size / info.compress_size > MAX_RATIO:
                raise ValueError("ZIP compression ratio is suspiciously high.")
            if name == "nexus-agent.json" or name.endswith("/nexus-agent.json"):
                manifest = name
        if not manifest:
            raise ValueError("ZIP must include nexus-agent.json at its root or project root.")
        raw = archive.read(manifest)
        if len(raw) > 64 * 1024:
            raise ValueError("nexus-agent.json must be smaller than 64 KB.")
        config = json.loads(raw.decode("utf-8"))
        if config.get("protocol") != "nexus-agent-v1":
            raise ValueError('Manifest protocol must be "nexus-agent-v1".')
        if config.get("runtime") != "node":
            raise ValueError('Only the isolated Node runtime is supported for ZIP agents.')
        entry = config.get("entrypoint", "index.js")
        if not isinstance(entry, str) or not entry or entry.startswith("/") or ".." in entry.replace("\\", "/").split("/"):
            raise ValueError("Manifest entrypoint must be a safe relative path.")
        project_root = manifest.rsplit("/", 1)[0] if "/" in manifest else ""
        expected = (project_root + "/" if project_root else "") + entry
        if expected not in [x.filename for x in infos]:
            raise ValueError("Manifest entrypoint does not exist in the ZIP.")
        return {"manifestPath": manifest, "projectRoot": project_root, "entrypoint": entry, "files": len(infos), "expandedBytes": total}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("--extract")
    args = parser.parse_args()
    try:
        result = inspect(args.archive)
        if args.extract:
            root = os.path.realpath(args.extract)
            os.makedirs(root, mode=0o755, exist_ok=True)
            with zipfile.ZipFile(args.archive) as archive:
                for info in archive.infolist():
                    target = os.path.realpath(os.path.join(root, info.filename))
                    if not target.startswith(root + os.sep):
                        raise ValueError("Unsafe extraction path.")
                    if info.is_dir():
                        os.makedirs(target, mode=0o755, exist_ok=True)
                    else:
                        os.makedirs(os.path.dirname(target), mode=0o755, exist_ok=True)
                        with archive.open(info) as src, open(target, "xb") as dst:
                            while True:
                                chunk = src.read(1024 * 1024)
                                if not chunk: break
                                dst.write(chunk)
                        os.chmod(target, 0o444)
            for current, dirs, files in os.walk(root):
                os.chmod(current, 0o555)
            result["extractPath"] = root
        try:
            scan = subprocess.run(["clamscan", "--no-summary", args.archive], capture_output=True, text=True, timeout=60)
            if scan.returncode == 0: result["securityStatus"] = "CLEAN"
            elif scan.returncode == 1: raise ValueError("ClamAV detected a potentially unsafe package.")
            else: result["securityStatus"] = "PENDING_SCAN"
        except FileNotFoundError:
            result["securityStatus"] = "PENDING_SCAN"
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
if __name__ == "__main__": main()
