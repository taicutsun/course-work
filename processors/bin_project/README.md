# Binary Exponentiation — Run & Visualize

Steps to run

- Build and run (release):

```bash
# build and run in release mode
cargo run --release

# or run in debug mode while developing
cargo run
```

Interactive examples (when prompted):

- Example A (small):
  - Base: 2
  - Exponent: 10
  - Modulus (leave empty)
  - Expected output: `Result: 2 ^ 10 = 1024`

- Example B (bigger):
  - Base: 5
  - Exponent: 20
  - Modulus (leave empty)
  - Expected output: `Result: 5 ^ 20 = 95367431640625`

- Example C (modular):
  - Base: 2
  - Exponent: 64
  - Modulus: 1000
  - Expected output: `Result: (2 ^ 64) % 1000 = 616`

- Example D (BigInt showcase):
  - Base: 1000000000000000000000000000000    # 1e30
  - Exponent: 3
  - Modulus (leave empty)
  - Expected output: `Result: 1` followed by `90` zeros (i.e. 10^90)

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

Install dependencies:

```bash
source ./bin_analysis/venv/bin/activate  # or use your own venv
python3 bin_analysis/plot.py              # writes PNGs under bin_analysis/plots
```

Notes

- Visualizer expects the normalized schema above and generates six plots: single/multi/iGPU for both Mac and Intel with x-axis `elapsed_seconds` (0–60) and y-axis `operations_per_second`.
- If you hit NumPy import issues on macOS, re-install the venv with a signed wheel or use system Python with `pip install pandas matplotlib`.
- If you want interactive BigInt mode or per-case statistics (stddev/min/max), tell me and I'll add flags for them.

Approximate sizes for ~10s per case

These are rough estimates — actual times depend strongly on CPU, memory, and whether `--big` (BigInt) mode is used. Run a single-case trial to calibrate for your machine.

- Quick estimates (modern laptop, 4 cores, 2.5–3.0 GHz):
  - u128 mode: operations complete very fast for 64-bit values. You will not reach 10s with u128 (stay below 128-bit inputs).
  - BigInt mode (arbitrary precision):
    - base bits 1024, exponent bits 1024 -> ~0.1–2 seconds
    - base bits 4096, exponent bits 2048 -> ~2–12 seconds (good starting point for ~10s)
    - base bits 8192, exponent bits 4096 -> often >>10 seconds (heavy)

- Recommendation: to hit ~10s, start with `Max base bits = 4096` and `Max exponent bits = 2048` in random mode and run 1 case; increase/decrease by a factor of 2 to converge.

If you need, I can add an automatic calibration mode that runs a few test cases and suggests max bits for ~10s target.
