"""Plot generator for benchmark CSVs with schema:
timestamp, elapsed_seconds, operations, operations_per_second.

Generates six graphs (single/multi/iGPU for Mac and Intel) with:
- x-axis: elapsed_seconds (0–60)
- y-axis: operations_per_second
"""

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent / "plots"

PLOT_CONFIGS = [
    ("res-mac-single.csv", "single_mac.png", "Single-Core Performance (Mac)"),
    ("res-intel-single.csv", "single_intel.png", "Single-Core Performance (Intel)"),
    ("res-mac-multi.csv", "multi_mac.png", "Multi-Core Performance (Mac)"),
    ("res-intel-multi.csv", "multi_intel.png", "Multi-Core Performance (Intel)"),
    ("res-mac-igpu.csv", "igpu_mac.png", "iGPU Performance (Mac)"),
    ("res-intel-igpu.csv", "igpu_intel.png", "iGPU Performance (Intel)"),
]

REQUIRED_COLS = {"timestamp", "elapsed_seconds", "operations", "operations_per_second"}


def load_series(path: Path):
    if not path.exists():
        print(f"Missing CSV: {path}, skipping.")
        return None
    df = pd.read_csv(path)
    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        print(f"{path} missing columns: {sorted(missing)}; skipping.")
        return None
    df = df.copy()
    df["elapsed_seconds"] = pd.to_numeric(df["elapsed_seconds"], errors="coerce")
    df["operations_per_second"] = pd.to_numeric(
        df["operations_per_second"], errors="coerce"
    )
    df = df.dropna(subset=["elapsed_seconds", "operations_per_second"])
    df = df.sort_values("timestamp")
    return df


def plot_series(df: pd.DataFrame, title: str, output_path: Path):
    plt.figure(figsize=(12, 7))
    plt.plot(
        df["elapsed_seconds"],
        df["operations_per_second"],
        marker="o",
        linestyle="-",
        linewidth=2,
        label="Operations per Second"
    )
    plt.xlabel("Elapsed seconds")
    plt.ylabel("Operations per second")
    plt.title(title)
    max_x = df["elapsed_seconds"].max()
    # If data is extremely small, keep a minimal positive span to avoid a flat axis
    if pd.isna(max_x) or max_x <= 0:
        max_x = 1.0
    plt.xlim(0, max_x)
    plt.grid(True, color='black', alpha=0.3)
    
    # Add axis spines (borders) for better visibility
    for spine in plt.gca().spines.values():
        spine.set_edgecolor('black')
        spine.set_linewidth(1)
    
    # Add legend in top right corner
    plt.legend(loc='upper right', frameon=True, fancybox=True, shadow=True)
    
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    print(f"Saved: {output_path}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    plt.style.use("seaborn-v0_8")
    
    # Set white background with black grid lines and visible axes
    plt.rcParams['figure.facecolor'] = 'white'
    plt.rcParams['axes.facecolor'] = 'white'
    plt.rcParams['grid.color'] = 'black'
    plt.rcParams['grid.alpha'] = 0.3
    plt.rcParams['axes.edgecolor'] = 'black'
    plt.rcParams['axes.labelcolor'] = 'black'
    plt.rcParams['xtick.color'] = 'black'
    plt.rcParams['ytick.color'] = 'black'
    plt.rcParams['text.color'] = 'black'

    for csv_name, out_name, title in PLOT_CONFIGS:
        csv_path = BASE_DIR / csv_name
        out_path = OUT_DIR / out_name
        df = load_series(csv_path)
        if df is None or df.empty:
            print(f"Skipping {csv_name} (no data).")
            continue
        plot_series(df, title, out_path)


if __name__ == "__main__":
    main()
