# Binary Exponentiation — Run & Visualize

Steps to run

```bash
cargo run
```
Batch / benchmark usage

- Input CSV format (no header): `base,exponent` (an optional modulus is still parsed but no longer emitted).
- Output CSV schema (normalized): `timestamp,elapsed_seconds,operations,operations_per_second`.
- Static mode now emits three per-architecture files:
  - `res-<arch>-single.csv` (single-core)
  - `res-<arch>-multi.csv` (multi-core)
  - `res-<arch>-igpu.csv` (integrated GPU simulation)
- `--batch` respects `--scenario single|multi|igpu` and appends to the matching file for your architecture (`mac` for Apple Silicon, `intel` for x86_64).

Where to see results

- The program prints interactive results to standard output (console).
- Results are appended per-architecture and scenario: `res-mac-single.csv`, `res-mac-multi.csv`, `res-mac-igpu.csv` (similarly for `res-intel-*`).

Python visualizer

```bash
source bin_analysis/venv/bin/activate

python3 bin_analysis/plot.py   # writes PNGs under bin_analysis/plots
```